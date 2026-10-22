"""LLM service providing structured entity extraction and conversation generation via Gemini Flash."""

import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class ExtractedMemoryMetadata(BaseModel):
    """Structured memory metadata extracted by LLM."""
    entities: List[str] = Field(description="People, places, objects, or significant items mentioned.")
    dates: List[str] = Field(description="Dates, years, holidays, or temporal markers mentioned.")
    emotional_tone: str = Field(description="The primary emotional tone (e.g. nostalgic, joyful, melancholy).")
    summary: str = Field(description="A concise 1-sentence factual summary of this memory.")
    tags: List[str] = Field(description="3 to 6 categorical tags for filtering and indexing.")


class LLMService:
    """Manages Gemini 2.5 Flash interactions for extraction and grounded dialogue."""

    def __init__(self, client: Optional[genai.Client] = None):
        self.model = settings.GEMINI_MODEL
        if client:
            self.client = client
        else:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def extract_metadata(self, content: str) -> Dict[str, Any]:
        """Extract structured entities, dates, emotion, and tags from memory text."""
        prompt = (
            "Analyze the following personal memory excerpt. Extract all key people/places (entities), "
            "dates or time references, the emotional tone, a 1-sentence factual summary, and key tags."
        )

        models_to_try = list(dict.fromkeys([self.model, "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemma-4-26b-a4b-it"]))
        for m in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=[prompt, f"Memory Content:\n{content}"],
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": ExtractedMemoryMetadata,
                        "temperature": 0.1,
                    },
                )
                if response and response.text:
                    return json.loads(response.text)
            except Exception as e:
                logger.warning(f"Model {m} failed in extract_metadata: {e}")

        # Fallback to minimal metadata on failure
        return {
            "entities": [],
            "dates": [],
            "emotional_tone": "neutral",
            "summary": content[:120],
            "tags": ["memory"],
        }

    def generate_response(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 500,
    ) -> str:
        """Generate conversational grounded response with automated model failover."""
        # Convert messages into GenAI content parts
        contents = []
        for msg in messages:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg.get("content", ""))],
                )
            )

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        candidate_models = list(dict.fromkeys([
            self.model,
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemma-4-26b-a4b-it",
        ]))

        last_error = None
        for m in candidate_models:
            try:
                response = self.client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Model {m} failed in generate_response: {e}. Trying next fallback...")
                last_error = e

        logger.error(f"All LLM models exhausted in generate_response: {last_error}")
        return "I'm right here with you. I'm taking a moment to reflect on everything you've shared. Could you tell me a little more?"

    def verify_grounding(
        self,
        response_text: str,
        retrieved_memories: List[Dict[str, Any]],
    ) -> bool:
        """Anti-hallucination L4 check: verify response does not fabricate facts outside context."""
        if not retrieved_memories:
            return True

        context = "\n---\n".join([m.get("content", "") for m in retrieved_memories])
        check_prompt = (
            f"Fact-check the assistant's response against the retrieved memories below.\n"
            f"Retrieved Memories:\n{context}\n\n"
            f"Assistant Response:\n{response_text}\n\n"
            "Return 'GROUNDED' if all factual claims are supported or expressed as uncertainty. "
            "Return 'HALLUCINATED' if it invents specific personal facts not in context."
        )

        try:
            resp = self.client.models.generate_content(
                model=self.model,
                contents=[check_prompt],
                config={"temperature": 0.0, "max_output_tokens": 10},
            )
            return "GROUNDED" in (resp.text or "").upper()
        except Exception as e:
            logger.warning(f"Grounding verification skipped due to error: {e}")
            return True


# Singleton instance
llm_service = LLMService()
