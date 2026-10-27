"""API route handlers for Avatar management."""

import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import AvatarCreate, AvatarUpdate, AvatarResponse
from backend.app.services.vector_service import vector_service
from backend.app.services.voice_service import voice_service
from backend.app.services.anam_service import anam_service
from backend.app.services.memory_service import memory_service

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


@router.post("/create-with-media", response_model=AvatarResponse, status_code=201)
async def create_avatar_with_media(
    name: str = Form(...),
    relationship: str = Form(...),
    bio: str = Form(""),
    subject_type: str = Form("living"),
    initial_memory: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    voice_sample: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Create a new avatar with photo portrait, optional voice cloning, and initial memory."""
    db = get_supabase_admin_client()
    avatar_id = str(uuid.uuid4())

    # 1. Validate and upload photo
    photo_bytes = await photo.read()
    if len(photo_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo file must be under 15MB.")

    ext = "jpg" if "jpeg" in (photo.content_type or "") or "jpg" in (photo.content_type or "") else "png"
    storage_path = f"{current_user['id']}/{avatar_id}/face.{ext}"

    try:
        storage = db.storage.from_("avatar-photos")
        storage.upload(
            path=storage_path,
            file=photo_bytes,
            file_options={"content-type": photo.content_type or "image/jpeg", "upsert": "true"},
        )
        photo_url = storage.get_public_url(storage_path)
    except Exception as st_err:
        logger.error("Failed to upload portrait to storage: %s", st_err)
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(st_err)}")

    persona_config = {
        "did_photo_url": photo_url,
    }

    # 2. Provision Anam.ai 16:9 Cara-4 digital avatar
    try:
        anam_avatar_id = anam_service.create_avatar_from_photo(name, photo_url)
        persona_config["anam_avatar_id"] = anam_avatar_id
    except Exception as an_err:
        logger.warning("Anam avatar generation notice: %s", an_err)

    # 3. Optional ElevenLabs Voice Clone + Anam Import
    if voice_sample:
        try:
            audio_bytes = await voice_sample.read()
            if len(audio_bytes) > 0:
                el_voice_id = await voice_service.create_instant_voice_clone(
                    name=name,
                    audio_bytes=audio_bytes,
                    filename=voice_sample.filename or "voice_sample.mp3",
                )
                persona_config["elevenlabs_voice_id"] = el_voice_id
                persona_config["elevenlabs_voice_name"] = f"{name}'s Voice"

                try:
                    anam_voice_id = anam_service.import_elevenlabs_voice(el_voice_id)
                    persona_config["anam_voice_id"] = anam_voice_id
                    persona_config["anam_persona_voice_id"] = anam_voice_id
                except Exception as imp_err:
                    logger.warning("Anam voice import notice: %s", imp_err)
        except Exception as v_err:
            logger.warning("Voice clone notice: %s", v_err)

    # 4. Provision Anam Persona linked to avatar & voice
    anam_avatar_id = persona_config.get("anam_avatar_id")
    anam_voice_id = persona_config.get("anam_voice_id")
    if anam_avatar_id:
        try:
            persona_prompt = f"You are {name}, a close {relationship} on Eternia. {bio}"
            anam_persona_id = anam_service.create_persona(
                avatar_id=anam_avatar_id,
                name=name,
                voice_id=anam_voice_id,
                system_prompt=persona_prompt,
            )
            persona_config["anam_persona_id"] = anam_persona_id
        except Exception as p_err:
            logger.warning("Anam persona generation notice: %s", p_err)

    # 5. Insert avatar into Supabase database
    data = {
        "id": avatar_id,
        "owner_id": current_user["id"],
        "name": name,
        "relationship": relationship,
        "subject_type": subject_type,
        "bio": bio or f"Beloved {relationship}",
        "personality_traits": ["warm", "caring", "attentive"],
        "catchphrases": [],
        "consent_status": "verified",
        "voice_status": "cloned" if persona_config.get("elevenlabs_voice_id") else "default",
        "memory_count": 1 if initial_memory else 0,
        "is_active": True,
        "persona_config": persona_config,
    }

    try:
        res = db.table("avatars").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save avatar record.")
    except Exception as exc:
        logger.error("Database insert failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")

    # 6. Embed initial memory into Qdrant & Supabase
    if initial_memory and initial_memory.strip():
        try:
            memory_service.ingest_single_memory(
                user_id=current_user["id"],
                avatar_id=avatar_id,
                content=initial_memory.strip(),
                source_type="manual",
            )
        except Exception as m_err:
            logger.warning("Initial memory preservation notice: %s", m_err)

    return AvatarResponse(**res.data[0])


@router.post("/{avatar_id}/clone-voice")
async def clone_avatar_voice(
    avatar_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload an audio recording to clone voice in ElevenLabs and import into Anam."""
    db = get_supabase_admin_client()
    existing = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not existing.data:
        raise AvatarNotFoundError(avatar_id)
    avatar = existing.data[0]
    if avatar["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file cannot be empty.")

    name = avatar.get("name", "Companion")
    persona_config = avatar.get("persona_config") or {}

    # 1. Clone in ElevenLabs
    try:
        el_voice_id = await voice_service.create_instant_voice_clone(
            name=name,
            audio_bytes=audio_bytes,
            filename=file.filename or "voice_sample.mp3",
        )
    except Exception as el_err:
        logger.error("ElevenLabs instant clone failed: %s", el_err)
        raise HTTPException(status_code=500, detail=f"ElevenLabs voice clone failed: {str(el_err)}")

    persona_config["elevenlabs_voice_id"] = el_voice_id
    persona_config["elevenlabs_voice_name"] = f"{name}'s Voice"

    # 2. Import into Anam.ai
    anam_voice_id = None
    try:
        anam_voice_id = anam_service.import_elevenlabs_voice(el_voice_id)
        persona_config["anam_voice_id"] = anam_voice_id
        persona_config["anam_persona_voice_id"] = anam_voice_id
    except Exception as an_err:
        logger.warning("Anam voice import notice: %s", an_err)

    # 3. Update Anam persona if avatar exists
    anam_avatar_id = persona_config.get("anam_avatar_id")
    if anam_avatar_id and anam_voice_id:
        try:
            new_persona_id = anam_service.create_persona(
                avatar_id=anam_avatar_id,
                name=name,
                voice_id=anam_voice_id,
            )
            persona_config["anam_persona_id"] = new_persona_id
        except Exception as p_err:
            logger.warning("Anam persona update notice: %s", p_err)

    # 4. Save to database
    db.table("avatars").update({
        "persona_config": persona_config,
        "voice_status": "cloned",
    }).eq("id", avatar_id).execute()

    return {
        "success": True,
        "elevenlabs_voice_id": el_voice_id,
        "anam_voice_id": anam_voice_id,
        "message": f"Successfully cloned and linked {name}'s voice!",
    }

