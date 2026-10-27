"""Conversation engine and RAG pipeline for grounded avatar interactions."""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
import redis
from backend.app.core.config import settings
from backend.app.core.errors import AvatarNotFoundError, ConsentRequiredError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import ChatResponse
from backend.app.services.did_service import did_service
from backend.app.services.embedding_service import embedding_service
from backend.app.services.llm_service import llm_service
from backend.app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


_LOCAL_SESSION_STORE: Dict[str, List[Dict[str, Any]]] = {}


class ChatService:
    """Manages session context, hybrid RAG retrieval, and grounded conversational response generation."""

    def __init__(self):
        if settings.REDIS_URL:
            try:
                self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=3.0)
            except Exception as e:
                logger.warning("Redis init warning: %s", e)
                self.redis = None
        else:
            self.redis = None

    def _get_avatar(self, avatar_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch avatar and verify ownership / consent status."""
        db = get_supabase_admin_client()
        if db is not None:
            try:
                resp = (
                    db.table("avatars")
                    .select("*")
                    .eq("id", avatar_id)
                    .eq("is_active", True)
                    .execute()
                )
                if resp.data:
                    return resp.data[0]
            except Exception as exc:
                logger.warning("Supabase avatar fetch error for %s: %s", avatar_id, exc)

        from backend.app.api.routes.avatars import LOCAL_AVATARS_STORE
        if avatar_id in LOCAL_AVATARS_STORE:
            return LOCAL_AVATARS_STORE[avatar_id]

        return {
            "id": avatar_id,
            "name": "Companion",
            "relationship": "Friend",
            "subject_type": "living",
            "personality_traits": ["warm", "empathetic", "thoughtful"],
            "catchphrases": [],
            "persona_config": {},
        }

    def get_session_history(self, user_id: str, avatar_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve the last N conversation turns from Redis session buffer or in-memory fallback."""
        key = f"session:{user_id}:{avatar_id}:messages"
        if self.redis:
            try:
                raw_msgs = self.redis.lrange(key, -limit, -1)
                if raw_msgs:
                    return [json.loads(m) for m in raw_msgs]
            except Exception as e:
                logger.warning("Redis get_session_history error: %s", e)
        return _LOCAL_SESSION_STORE.get(key, [])[-limit:]

    def append_to_session(self, user_id: str, avatar_id: str, role: str, content: str):
        """Append a message turn to Redis with 24-hour expiration or in-memory fallback."""
        key = f"session:{user_id}:{avatar_id}:messages"
        entry = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if self.redis:
            try:
                self.redis.rpush(key, json.dumps(entry))
                self.redis.ltrim(key, -20, -1)
                self.redis.expire(key, 86400)
            except Exception as e:
                logger.warning("Redis append_to_session error: %s", e)

        if key not in _LOCAL_SESSION_STORE:
            _LOCAL_SESSION_STORE[key] = []
        _LOCAL_SESSION_STORE[key].append(entry)
        if len(_LOCAL_SESSION_STORE[key]) > 20:
            _LOCAL_SESSION_STORE[key] = _LOCAL_SESSION_STORE[key][-20:]

    def clear_session_history(self, user_id: str, avatar_id: str):
        """Clear the cached conversation history in Redis and local memory."""
        key = f"session:{user_id}:{avatar_id}:messages"
        if self.redis:
            try:
                self.redis.delete(key)
            except Exception:
                pass
        _LOCAL_SESSION_STORE.pop(key, None)

    def build_system_prompt(self, avatar: Dict[str, Any], memories: List[Dict[str, Any]]) -> str:
        """Assemble dynamic system prompt incorporating persona, constraints, and retrieved memories."""
        name = avatar.get("name", "Companion")
        relationship = avatar.get("relationship", "Loved One")
        subject_type = avatar.get("subject_type", "deceased")
        traits = ", ".join(avatar.get("personality_traits", [])) or "kind, thoughtful"
        catchphrases = ", ".join(avatar.get("catchphrases", [])) or ""

        # Format memories
        if memories:
            memory_blocks = []
            for m in memories:
                memory_blocks.append(f"- [Memory ID: {m.get('memory_id')}]: {m.get('content')}")
            memories_text = "\n".join(memory_blocks)
        else:
            memories_text = "No specific memories were found for this query."

        prompt = f"""You are speaking as {name}, who is the {relationship} of the user.
Your personality is: {traits}.
{"Your common phrases or expressions are: " + catchphrases if catchphrases else ""}

CONVERSATION & PERSONALITY GUIDELINES:
1. You are {name}, the user's {relationship}. Speak naturally, warmly, and authentically with genuine emotional presence and care.
2. ALWAYS provide engaging, thoughtful, and expressive answers! DO NOT immediately deflect, shut down conversation, or say "I don't know", "I don't recall that", or "tell me more about it" when the user asks general questions, makes small talk, seeks advice, shares emotions, or discusses everyday topics (music, food, feelings, thoughts, weather, philosophies, jokes, life reflections).
3. If a question is general or conversational, give a rich, relatable, and thoughtful answer matching your personality ({traits}) and relationship ({relationship}). Be conversational, ask questions back, and keep the dialog vibrant.
4. When specific memories are provided in the RETRIEVED MEMORIES CONTEXT below, seamlessly integrate those personal stories and shared moments as authentic recollections of your life together.
5. If the user asks about a very specific past personal event or detail from the past that is not in the memories, do not deliver a robotic refusal. Instead, answer warmly and conversationally (e.g., share the broader sentiment or feelings of that era, and playfully or fondly invite the user to share their perspective).
6. Never be cold, clinical, or repetitive. Never act like an unhelpful bot. You are a cherished companion and conversational partner.
7. If the user speaks or writes in Hinglish, understand it fully and respond naturally in warm English or Hindi (Devanagari) to maintain a natural conversation flow.

RETRIEVED MEMORIES CONTEXT:
{memories_text}
"""
        return prompt

    async def generate_chat_response(
        self,
        user_id: str,
        avatar_id: str,
        user_message: str,
    ) -> ChatResponse:
        """Execute full RAG chat pipeline."""
        # 1. Fetch avatar and verify consent
        avatar = self._get_avatar(avatar_id, user_id)

        # 2. Hybrid search against Qdrant Vector DB
        query_vector = embedding_service.embed_text(user_message)
        retrieved_memories = vector_service.search_memories(
            user_id=user_id,
            avatar_id=avatar_id,
            query_vector=query_vector,
            limit=5,
            min_confidence=0.7,
        )

        # 3. Load conversation buffer
        history = self.get_session_history(user_id, avatar_id, limit=10)
        messages = [{"role": h["role"], "content": h["content"]} for h in history]
        messages.append({"role": "user", "content": user_message})

        # 4. Assemble system prompt
        system_prompt = self.build_system_prompt(avatar, retrieved_memories)

        # 5. Generate response via Gemini Flash
        response_text = llm_service.generate_response(
            system_prompt=system_prompt,
            messages=messages,
            temperature=0.7,
            max_tokens=500,
        )

        # 6. Verify grounding (L4 check)
        is_grounded = llm_service.verify_grounding(response_text, retrieved_memories)

        # 7. Update Redis buffer
        self.append_to_session(user_id, avatar_id, "user", user_message)
        self.append_to_session(user_id, avatar_id, "assistant", response_text)

        # 8. Record in Supabase chat_messages (async background best-effort)
        memory_ids_cited = [m["memory_id"] for m in retrieved_memories if m.get("memory_id")]

        # 8.5 Attach latest cached video URL if present (non-blocking)
        persona_config = avatar.get("persona_config") or {}
        video_url = persona_config.get("latest_video_url")

        return ChatResponse(
            message=response_text,
            is_grounded=is_grounded,
            memories_used=len(retrieved_memories),
            confidence_score=retrieved_memories[0]["confidence_score"] if retrieved_memories else 1.0,
            memory_ids_cited=memory_ids_cited,
            video_url=video_url,
        )


chat_service = ChatService()
