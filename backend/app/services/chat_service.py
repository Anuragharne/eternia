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


class ChatService:
    """Manages session context, hybrid RAG retrieval, and grounded conversational response generation."""

    def __init__(self):
        self.db = get_supabase_admin_client()
        self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)

    def _get_avatar(self, avatar_id: str, user_id: str) -> Dict[str, Any]:
        """Fetch avatar and verify ownership / consent status."""
        resp = (
            self.db.table("avatars")
            .select("*")
            .eq("id", avatar_id)
            .eq("is_active", True)
            .execute()
        )
        if not resp.data:
            raise AvatarNotFoundError(avatar_id)

        avatar = resp.data[0]
        # Testing phase: Uncapped and unrestricted chat access for all companions
        return avatar

    def get_session_history(self, user_id: str, avatar_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Retrieve the last N conversation turns from Redis session buffer."""
        key = f"session:{user_id}:{avatar_id}:messages"
        raw_msgs = self.redis.lrange(key, -limit, -1)
        return [json.loads(m) for m in raw_msgs] if raw_msgs else []

    def append_to_session(self, user_id: str, avatar_id: str, role: str, content: str):
        """Append a message turn to Redis with 24-hour expiration."""
        key = f"session:{user_id}:{avatar_id}:messages"
        entry = json.dumps({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
        })
        self.redis.rpush(key, entry)
        self.redis.ltrim(key, -20, -1)  # Keep last 20 turns
        self.redis.expire(key, 86400)    # 24 hours TTL

    def clear_session_history(self, user_id: str, avatar_id: str):
        """Clear the cached conversation history in Redis."""
        key = f"session:{user_id}:{avatar_id}:messages"
        self.redis.delete(key)

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

        # 8.5 Generate D-ID talking avatar video (optional, non-blocking)
        video_url = None
        persona_config = avatar.get("persona_config") or {}
        did_photo_url = persona_config.get("did_photo_url")

        if did_photo_url:
            try:
                video_url = await did_service.generate_talk_video(
                    source_url=did_photo_url,
                    text=response_text[:500],
                )
            except Exception as vid_err:
                logger.warning("D-ID video generation skipped: %s", vid_err)
                video_url = None

        return ChatResponse(
            message=response_text,
            is_grounded=is_grounded,
            memories_used=len(retrieved_memories),
            confidence_score=retrieved_memories[0]["confidence_score"] if retrieved_memories else 1.0,
            memory_ids_cited=memory_ids_cited,
            video_url=video_url,
        )


chat_service = ChatService()
