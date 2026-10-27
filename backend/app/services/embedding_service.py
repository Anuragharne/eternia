"""Embedding generation service using Google GenAI SDK with semantic chunking."""

import hashlib
import logging
from typing import Dict, List, Optional
from google import genai
from google.genai import types
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Manages text chunking, deduplication, and 768-dim vector embedding generation."""

    def __init__(self, client: Optional[genai.Client] = None):
        self.model = settings.EMBEDDING_MODEL
        self.output_dim = 768
        self._cache: Dict[str, List[float]] = {}
        if client:
            self.client = client
        elif settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        else:
            self.client = None

    @staticmethod
    def get_content_hash(text: str) -> str:
        """Compute SHA-256 hash of normalized text for deduplication."""
        return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()

    def chunk_text(
        self,
        text: str,
        target_tokens: int = 200,
        overlap: int = 50,
    ) -> List[str]:
        """Semantic chunking strategy with target word count and overlap.

        Approx. 1 token ~= 0.75 words, so 200 tokens ~= 150 words.
        """
        words = text.split()
        if not words:
            return []

        target_words = int(target_tokens * 0.75)
        overlap_words = int(overlap * 0.75)

        if len(words) <= target_words:
            return [text.strip()]

        chunks = []
        start = 0
        while start < len(words):
            end = min(start + target_words, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk.strip())

            if end >= len(words):
                break
            start += target_words - overlap_words

        return chunks

    def embed_text(self, text: str) -> List[float]:
        """Generate a single 768-dimensional embedding for text."""
        content_hash = self.get_content_hash(text)
        if content_hash in self._cache:
            return self._cache[content_hash]

        config = types.EmbedContentConfig(output_dimensionality=self.output_dim)
        response = self.client.models.embed_content(
            model=self.model,
            contents=text,
            config=config,
        )

        embedding = response.embeddings[0].values
        self._cache[content_hash] = embedding
        return embedding

    def embed_batch(self, texts: List[str], batch_size: int = 50) -> List[List[float]]:
        """Batch embedding generation supporting up to 50 texts per call."""
        results: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            uncached_texts = []
            uncached_indices = []

            for idx, text in enumerate(batch):
                c_hash = self.get_content_hash(text)
                if c_hash in self._cache:
                    continue
                uncached_texts.append(text)
                uncached_indices.append(idx)

            if uncached_texts:
                config = types.EmbedContentConfig(output_dimensionality=self.output_dim)
                contents_payload = [
                    types.Content(parts=[types.Part.from_text(text=t)])
                    for t in uncached_texts
                ]
                try:
                    response = self.client.models.embed_content(
                        model=self.model,
                        contents=contents_payload,
                        config=config,
                    )
                except Exception as e:
                    logger.warning(f"Error embedding with {self.model}: {e}. Retrying with gemini-embedding-2-preview...")
                    response = self.client.models.embed_content(
                        model="gemini-embedding-2-preview",
                        contents=contents_payload,
                        config=config,
                    )

                for text, emb in zip(uncached_texts, response.embeddings):
                    c_hash = self.get_content_hash(text)
                    self._cache[c_hash] = emb.values

            # Assemble batch results from cache
            for text in batch:
                c_hash = self.get_content_hash(text)
                results.append(self._cache[c_hash])

        return results


# Singleton instance
embedding_service = EmbeddingService()
