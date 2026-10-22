"""Qdrant Vector Database service for semantic memory retrieval."""

import logging
from typing import Any, Dict, List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class VectorService:
    """Manages Qdrant vector operations with mandatory tenant isolation."""

    def __init__(self, client: Optional[QdrantClient] = None):
        self.collection_name = settings.QDRANT_COLLECTION
        if client:
            self.client = client
        else:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                timeout=20,
            )

    def setup_collection(self) -> bool:
        """Create the memories collection and payload indexes if not already present."""
        try:
            exists = self.client.collection_exists(collection_name=self.collection_name)
            if not exists:
                logger.info(f"Creating collection '{self.collection_name}' with 768-dim Cosine distance")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=768,
                        distance=models.Distance.COSINE,
                    ),
                    optimizers_config=models.OptimizersConfigDiff(
                        indexing_threshold=20000,
                    ),
                    on_disk_payload=True,
                )

            # Ensure payload indexes exist
            # 1. user_id (Mandatory isolation filter)
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="user_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )

            # 2. avatar_id (Scope filter)
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="avatar_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )

            # 3. confidence_score (Quality filter)
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="confidence_score",
                field_schema=models.PayloadSchemaType.FLOAT,
            )

            # 4. content (BM25 keyword search index)
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="content",
                field_schema=models.TextIndexParams(
                    type="text",
                    tokenizer=models.TokenizerType.WORD,
                    min_token_len=2,
                    max_token_len=20,
                    lowercase=True,
                ),
            )

            logger.info("Qdrant collection and payload indexes setup successfully.")
            return True
        except Exception as e:
            logger.error(f"Error setting up Qdrant collection: {e}")
            raise e

    def upsert_memory(
        self,
        point_id: str,
        vector: List[float],
        payload: Dict[str, Any],
    ) -> bool:
        """Upsert a single memory vector and payload into Qdrant."""
        if "user_id" not in payload or "avatar_id" not in payload:
            raise ValueError("Payload MUST contain 'user_id' and 'avatar_id' for isolation.")

        point = models.PointStruct(
            id=point_id,
            vector=vector,
            payload=payload,
        )

        self.client.upsert(
            collection_name=self.collection_name,
            points=[point],
        )
        return True

    def search_memories(
        self,
        user_id: str,
        avatar_id: str,
        query_vector: List[float],
        limit: int = 5,
        min_confidence: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """Dense vector search with strict tenant isolation and confidence gating."""
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="user_id",
                    match=models.MatchValue(value=user_id),
                ),
                models.FieldCondition(
                    key="avatar_id",
                    match=models.MatchValue(value=avatar_id),
                ),
                models.FieldCondition(
                    key="confidence_score",
                    range=models.Range(gte=min_confidence),
                ),
            ]
        )

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        )

        memories = []
        for hit in results.points:
            payload = hit.payload or {}
            memories.append(
                {
                    "point_id": hit.id,
                    "score": hit.score,
                    "memory_id": payload.get("memory_id"),
                    "content": payload.get("content"),
                    "source_type": payload.get("source_type"),
                    "memory_date": payload.get("memory_date"),
                    "confidence_score": payload.get("confidence_score"),
                    "tags": payload.get("tags", []),
                    "entities": payload.get("entities", []),
                }
            )

        return memories

    def delete_memory(self, point_id: str) -> bool:
        """Delete a specific memory point by ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.PointIdsList(points=[point_id]),
        )
        return True

    def delete_avatar_memories(self, avatar_id: str) -> bool:
        """Delete all vectors belonging to an avatar upon consent revocation."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="avatar_id",
                            match=models.MatchValue(value=avatar_id),
                        )
                    ]
                )
            ),
        )
        return True


# Singleton vector service instance
vector_service = VectorService()
