"""Memory ingestion pipeline service orchestrating parsing, extraction, chunking, embedding, and storage."""

import logging
import uuid
from typing import Any, Dict, List, Optional
from backend.app.core.errors import MemoryLimitError, AvatarNotFoundError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import MemoryResponse, MemoryStatsResponse
from backend.app.services.embedding_service import embedding_service
from backend.app.services.llm_service import llm_service
from backend.app.services.vector_service import vector_service
from backend.app.services.parsers import parse_document

logger = logging.getLogger(__name__)

# Quality-based confidence scores
SOURCE_CONFIDENCE_SCORES = {
    "manual": 1.0,
    "journal": 0.95,
    "user_contributed": 0.90,
    "voice_transcript": 0.85,
    "photo_caption": 0.85,
    "chat_export": 0.85,
}

FREE_TIER_MEMORY_LIMIT = 50


class MemoryService:
    """Orchestrates end-to-end memory processing: text -> metadata -> vector -> storage."""

    def __init__(self):
        self.db = get_supabase_admin_client()

    def _check_memory_limit(self, avatar_id: str, count_to_add: int = 1):
        """Testing phase: Uncapped and unlimited memory storage."""
        pass

    def ingest_single_memory(
        self,
        user_id: str,
        avatar_id: str,
        content: str,
        source_type: str = "manual",
        memory_date: Optional[str] = None,
        custom_tags: Optional[List[str]] = None,
        fast_meta: bool = False,
    ) -> Optional[MemoryResponse]:
        """Process and store a single memory entry."""
        content = (content or "").strip()
        if not content:
            return None

        # Supabase Postgres memories table has strict: CHECK (char_length(content) BETWEEN 1 AND 10000)
        if len(content) > 9900:
            content = content[:9900]

        self._check_memory_limit(avatar_id, count_to_add=1)

        confidence = SOURCE_CONFIDENCE_SCORES.get(source_type, 0.90)

        # 1. Metadata Extraction (LLM or fast heuristic for bulk)
        if fast_meta:
            entities = custom_tags or []
            all_tags = list(set((custom_tags or []) + [source_type, "memory"]))
            llm_meta = {
                "entities": entities,
                "dates": [memory_date] if memory_date else [],
                "emotional_tone": "warm",
                "summary": content[:120],
                "tags": all_tags,
            }
        else:
            llm_meta = llm_service.extract_metadata(content)
            entities = llm_meta.get("entities", [])
            extracted_tags = llm_meta.get("tags", [])
            all_tags = list(set((custom_tags or []) + extracted_tags))

        # 2. Chunking (if long)
        chunks = embedding_service.chunk_text(content, target_tokens=200, overlap=50)
        primary_chunk = chunks[0] if chunks else content

        # 3. Vector Embedding (768-dim)
        vector = embedding_service.embed_text(primary_chunk)

        # 4. Generate Point ID & Postgres ID
        memory_id = str(uuid.uuid4())
        qdrant_point_id = str(uuid.uuid4())

        # 5. Upsert to Qdrant Vector Store
        qdrant_payload = {
            "user_id": user_id,
            "avatar_id": avatar_id,
            "memory_id": memory_id,
            "content": content,
            "source_type": source_type,
            "memory_date": memory_date,
            "confidence_score": confidence,
            "tags": all_tags,
            "entities": entities,
            "chunk_index": 0,
            "total_chunks": len(chunks),
        }
        vector_service.upsert_memory(
            point_id=qdrant_point_id,
            vector=vector,
            payload=qdrant_payload,
        )

        # 6. Insert record into Supabase Postgres
        db_payload = {
            "id": memory_id,
            "avatar_id": avatar_id,
            "uploaded_by": user_id,
            "content": content,
            "source_type": source_type,
            "memory_date": memory_date,
            "tags": all_tags,
            "confidence_score": confidence,
            "qdrant_point_id": qdrant_point_id,
            "extracted_entities": entities,
            "extracted_metadata": llm_meta,
            "is_active": True,
        }
        res = self.db.table("memories").insert(db_payload).execute()
        created = res.data[0] if res.data else db_payload

        return MemoryResponse(
            id=created["id"],
            avatar_id=created["avatar_id"],
            uploaded_by=created["uploaded_by"],
            content=created["content"],
            source_type=created["source_type"],
            memory_date=created.get("memory_date"),
            tags=created.get("tags", []),
            confidence_score=created.get("confidence_score", 1.0),
            qdrant_point_id=created.get("qdrant_point_id"),
            extracted_entities=created.get("extracted_entities", []),
            extracted_metadata=created.get("extracted_metadata", {}),
            created_at=created.get("created_at"),
        )

    def ingest_file(
        self,
        user_id: str,
        avatar_id: str,
        file_bytes: bytes,
        filename: str,
    ) -> List[MemoryResponse]:
        """Parse uploaded document and ingest all extracted memories."""
        parsed_entries = parse_document(file_bytes, filename)
        if not parsed_entries:
            return []

        self._check_memory_limit(avatar_id, count_to_add=len(parsed_entries))

        # If more than 3 entries, use fast heuristic extraction to prevent quota exhaustion and long latency
        is_bulk = len(parsed_entries) > 3

        ingested_memories = []
        for entry in parsed_entries:
            content = entry.get("content", "").strip()
            if not content:
                continue

            src_type = entry.get("source_type", "journal")
            raw_date = entry.get("raw_date")

            custom_tags = []
            if entry.get("sender"):
                custom_tags.append(entry["sender"])

            mem = self.ingest_single_memory(
                user_id=user_id,
                avatar_id=avatar_id,
                content=content,
                source_type=src_type,
                memory_date=raw_date,
                custom_tags=custom_tags,
                fast_meta=is_bulk,
            )
            if mem:
                ingested_memories.append(mem)

        return ingested_memories

    def get_avatar_memories(
        self,
        avatar_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> List[MemoryResponse]:
        """Fetch active memories for an avatar."""
        res = (
            self.db.table("memories")
            .select("*")
            .eq("avatar_id", avatar_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .range(skip, skip + limit - 1)
            .execute()
        )

        return [
            MemoryResponse(
                id=m["id"],
                avatar_id=m["avatar_id"],
                uploaded_by=m["uploaded_by"],
                content=m["content"],
                source_type=m["source_type"],
                memory_date=m.get("memory_date"),
                tags=m.get("tags", []),
                confidence_score=m.get("confidence_score", 1.0),
                qdrant_point_id=m.get("qdrant_point_id"),
                extracted_entities=m.get("extracted_entities", []),
                extracted_metadata=m.get("extracted_metadata", {}),
                created_at=m.get("created_at"),
            )
            for m in res.data
        ]

    def get_memory_stats(self, avatar_id: str) -> MemoryStatsResponse:
        """Compute memory statistics by source type."""
        res = (
            self.db.table("memories")
            .select("source_type")
            .eq("avatar_id", avatar_id)
            .eq("is_active", True)
            .execute()
        )

        breakdown: Dict[str, int] = {}
        for row in res.data:
            st = row["source_type"]
            breakdown[st] = breakdown.get(st, 0) + 1

        return MemoryStatsResponse(
            avatar_id=avatar_id,
            total_memories=len(res.data),
            source_breakdown=breakdown,
        )

    def delete_memory(self, memory_id: str) -> bool:
        """Soft delete memory in Postgres and remove point from Qdrant."""
        # Get qdrant_point_id
        res = self.db.table("memories").select("qdrant_point_id, avatar_id").eq("id", memory_id).execute()
        if not res.data:
            return False

        point_id = res.data[0].get("qdrant_point_id")
        if point_id:
            try:
                vector_service.delete_memory(point_id)
            except Exception as e:
                logger.warning(f"Error removing vector {point_id} from Qdrant: {e}")

        # Soft delete in Postgres (triggers avatar memory_count decrement)
        self.db.table("memories").update({"is_active": False}).eq("id", memory_id).execute()
        return True


memory_service = MemoryService()
