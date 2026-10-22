"""API route handlers for Memory ingestion and management."""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, Query, UploadFile
from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import MemoryCreate, MemoryResponse, MemoryStatsResponse
from backend.app.services.memory_service import memory_service

router = APIRouter(prefix="/memories", tags=["Memories"])


def _verify_avatar_ownership(avatar_id: str, user_id: str):
    db = get_supabase_admin_client()
    res = db.table("avatars").select("owner_id").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)
    if res.data[0]["owner_id"] != user_id:
        raise ForbiddenError("You do not own this avatar.")


@router.post("", response_model=MemoryResponse, status_code=201)
def add_memory(
    payload: MemoryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Ingest a single memory into Postgres and Qdrant."""
    _verify_avatar_ownership(payload.avatar_id, current_user["id"])

    memory = memory_service.ingest_single_memory(
        user_id=current_user["id"],
        avatar_id=payload.avatar_id,
        content=payload.content,
        source_type=payload.source_type,
        memory_date=payload.memory_date.isoformat() if payload.memory_date else None,
        custom_tags=payload.tags,
    )
    return memory


@router.get("/{avatar_id}", response_model=List[MemoryResponse])
def get_memories(
    avatar_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all active memories for an avatar."""
    _verify_avatar_ownership(avatar_id, current_user["id"])
    return memory_service.get_avatar_memories(avatar_id, skip=skip, limit=limit)


@router.post("/{avatar_id}/import", response_model=List[MemoryResponse])
async def import_memories_file(
    avatar_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Bulk import memories from uploaded file (.txt, .pdf, .docx, WhatsApp chat export)."""
    _verify_avatar_ownership(avatar_id, current_user["id"])

    content_bytes = await file.read()
    memories = memory_service.ingest_file(
        user_id=current_user["id"],
        avatar_id=avatar_id,
        file_bytes=content_bytes,
        filename=file.filename or "upload.txt",
    )
    return memories


@router.get("/{avatar_id}/stats", response_model=MemoryStatsResponse)
def get_memory_stats(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get memory counts and source breakdown for an avatar."""
    _verify_avatar_ownership(avatar_id, current_user["id"])
    return memory_service.get_memory_stats(avatar_id)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(
    memory_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Soft delete a memory and purge its vector point."""
    success = memory_service.delete_memory(memory_id)
    if not success:
        pass
    return None
