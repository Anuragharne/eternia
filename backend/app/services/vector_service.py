"""
Qdrant vector database service — manages memory embeddings.
"""
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from typing import List, Optional
import uuid

from app.core.config import settings


class VectorService:
    """
    Manages vector operations in Qdrant for memory storage and retrieval.
    
    Each memory is stored as a vector with metadata including:
    - user_id: namespace isolation (critical for privacy)
    - avatar_id: which avatar this memory belongs to
    - source_type: how the memory was created
    - memory_date: when the memory occurred
    - confidence_score: quality/reliability of the memory
    - content: the original text (stored as payload)
    """

    VECTOR_DIMENSION = 768  # text-embedding-004 dimension

    def __init__(self):
        self.client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
        )
        self.collection_name = settings.QDRANT_COLLECTION_NAME

    async def ensure_collection(self):
        """Create the memories collection if it doesn't exist."""
        collections = self.client.get_collections().collections
        existing_names = [c.name for c in collections]

        if self.collection_name not in existing_names:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.VECTOR_DIMENSION,
                    distance=Distance.COSINE,
                ),
            )

    async def store_memory(
        self,
        embedding: List[float],
        user_id: str,
        avatar_id: str,
        memory_id: str,
        content: str,
        source_type: str = "manual",
        memory_date: Optional[str] = None,
        confidence_score: float = 1.0,
        tags: Optional[List[str]] = None,
    ) -> str:
        """
        Store a memory embedding in Qdrant.
        
        Args:
            embedding: The vector embedding of the memory text.
            user_id: Owner's user ID (for namespace isolation).
            avatar_id: Which avatar this memory belongs to.
            memory_id: Unique ID for this memory.
            content: Original memory text (stored as searchable payload).
            source_type: How the memory was created.
            memory_date: When the memory occurred (ISO format string).
            confidence_score: Quality/reliability score (0.0 to 1.0).
            tags: Optional categorization tags.
            
        Returns:
            The point ID in Qdrant.
        """
        point_id = str(uuid.uuid4())

        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "user_id": user_id,
                        "avatar_id": avatar_id,
                        "memory_id": memory_id,
                        "content": content,
                        "source_type": source_type,
                        "memory_date": memory_date,
                        "confidence_score": confidence_score,
                        "tags": tags or [],
                    },
                )
            ],
        )

        return point_id

    async def search_memories(
        self,
        query_embedding: List[float],
        avatar_id: str,
        user_id: str,
        top_k: int = 20,
        min_confidence: float = 0.7,
    ) -> List[dict]:
        """
        Search for relevant memories using vector similarity.
        
        Filters by user_id and avatar_id for privacy isolation.
        Only returns memories above the confidence threshold.
        
        Args:
            query_embedding: The vector embedding of the user's query.
            avatar_id: Filter to this avatar's memories only.
            user_id: Filter to this user's data only (privacy).
            top_k: Number of results to return.
            min_confidence: Minimum confidence score filter.
            
        Returns:
            List of memory dicts with content, score, and metadata.
        """
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            query_filter=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    FieldCondition(key="avatar_id", match=MatchValue(value=avatar_id)),
                ]
            ),
            limit=top_k,
            score_threshold=min_confidence,
        )

        return [
            {
                "id": hit.id,
                "score": hit.score,
                "content": hit.payload.get("content", ""),
                "source_type": hit.payload.get("source_type", "unknown"),
                "memory_date": hit.payload.get("memory_date"),
                "confidence_score": hit.payload.get("confidence_score", 0.0),
                "tags": hit.payload.get("tags", []),
            }
            for hit in results
        ]

    async def delete_avatar_memories(self, avatar_id: str, user_id: str):
        """Delete ALL memory vectors for a specific avatar. Used in consent revocation."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    FieldCondition(key="avatar_id", match=MatchValue(value=avatar_id)),
                ]
            ),
        )


# Singleton instance
vector_service = VectorService()
