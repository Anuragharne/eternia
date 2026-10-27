"""API route handlers for Avatar management."""

import logging
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import AvatarCreate, AvatarUpdate, AvatarResponse
from backend.app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/avatars", tags=["Avatars"])


@router.post("", response_model=AvatarResponse, status_code=201)
def create_avatar(
    payload: AvatarCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new avatar persona."""
    db = get_supabase_admin_client()
    avatar_id = str(uuid.uuid4())

    data = {
        "id": avatar_id,
        "owner_id": current_user["id"],
        "name": payload.name,
        "relationship": payload.relationship,
        "subject_type": payload.subject_type,
        "bio": payload.bio,
        "personality_traits": payload.personality_traits,
        "catchphrases": payload.catchphrases,
        "consent_status": "verified",
        "voice_status": "placeholder",
        "memory_count": 0,
        "is_active": True,
    }

    try:
        res = db.table("avatars").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create avatar.")
        return AvatarResponse(**res.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to insert avatar: %s", exc)
        raise HTTPException(status_code=400, detail=f"Database error: {str(exc)}")


@router.get("", response_model=List[AvatarResponse])
def list_avatars(
    current_user: dict = Depends(get_current_user),
):
    """List all active avatars belonging to the authenticated user."""
    db = get_supabase_admin_client()
    res = (
        db.table("avatars")
        .select("*")
        .eq("owner_id", current_user["id"])
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    )
    return [AvatarResponse(**item) for item in res.data]


@router.get("/{avatar_id}", response_model=AvatarResponse)
def get_avatar(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific avatar."""
    db = get_supabase_admin_client()
    res = (
        db.table("avatars")
        .select("*")
        .eq("id", avatar_id)
        .eq("is_active", True)
        .execute()
    )
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    if avatar["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    return AvatarResponse(**avatar)


@router.patch("/{avatar_id}", response_model=AvatarResponse)
def update_avatar(
    avatar_id: str,
    payload: AvatarUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update avatar personality traits, bio, or name."""
    db = get_supabase_admin_client()
    existing = db.table("avatars").select("owner_id").eq("id", avatar_id).execute()
    if not existing.data:
        raise AvatarNotFoundError(avatar_id)
    if existing.data[0]["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
    res = db.table("avatars").update(update_data).eq("id", avatar_id).execute()
    return AvatarResponse(**res.data[0])


@router.delete("/{avatar_id}", status_code=204)
def delete_avatar(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an avatar and purge all vector embeddings."""
    db = get_supabase_admin_client()
    existing = db.table("avatars").select("owner_id").eq("id", avatar_id).execute()
    if not existing.data:
        raise AvatarNotFoundError(avatar_id)
    if existing.data[0]["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    # Purge vectors
    vector_service.delete_avatar_memories(avatar_id)

    # Soft delete in db (cascades memories)
    db.table("avatars").update({"is_active": False}).eq("id", avatar_id).execute()
    return None
