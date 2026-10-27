"""API route handlers for Avatar management with seamless in-memory fallback store."""

import base64
import logging
import uuid
from typing import Dict, List, Optional
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

# ============================================================
# PERSISTENT IN-MEMORY AVATARS STORE (Fallback & Cache)
# ============================================================

LOCAL_AVATARS_STORE: Dict[str, dict] = {
    "avatar-kabir": {
        "id": "avatar-kabir",
        "owner_id": "demo-user-id",
        "name": "Kabir",
        "relationship": "Brother & Lifelong Friend",
        "subject_type": "deceased",
        "bio": "Warm, witty, reflective older brother who loves acoustic guitar, astrophysics, and hiking the Himalayan trails. Speaks with gentle humor and thoughtful pauses.",
        "personality_traits": ["warm", "witty", "reflective", "musical"],
        "catchphrases": ["Keep looking at the stars", "Nothing genuine is ever truly lost"],
        "voice_status": "placeholder",
        "consent_status": "verified",
        "photo_s3_key": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
        "memory_count": 14,
        "is_active": True,
        "persona_config": {
            "did_photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
        },
    },
    "avatar-elena": {
        "id": "avatar-elena",
        "owner_id": "demo-user-id",
        "name": "Elena",
        "relationship": "Grandmother & Storyteller",
        "subject_type": "deceased",
        "bio": "Gentle, wise grandmother known for her lavender tea recipes, handwritten letters, and comforting midnight stories about the old town garden.",
        "personality_traits": ["gentle", "wise", "comforting", "caring"],
        "catchphrases": ["Rest your spirit, child", "A cup of tea untangles every knot"],
        "voice_status": "placeholder",
        "consent_status": "verified",
        "photo_s3_key": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
        "memory_count": 22,
        "is_active": True,
        "persona_config": {
            "did_photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
        },
    },
}


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
        "owner_id": current_user.get("id", "demo-user-id"),
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
        "persona_config": {},
    }

    if db is not None:
        try:
            res = db.table("avatars").insert(data).execute()
            if res.data:
                record = res.data[0]
                LOCAL_AVATARS_STORE[avatar_id] = record
                return AvatarResponse(**record)
        except Exception as exc:
            logger.warning("Supabase insert failed, saving to local store: %s", exc)

    LOCAL_AVATARS_STORE[avatar_id] = data
    return AvatarResponse(**data)


@router.get("", response_model=List[AvatarResponse])
def list_avatars(
    current_user: dict = Depends(get_current_user),
):
    """List all active avatars belonging to the user, with local fallback."""
    db = get_supabase_admin_client()
    avatars_dict = {k: v for k, v in LOCAL_AVATARS_STORE.items() if v.get("is_active", True)}

    if db is not None:
        try:
            res = (
                db.table("avatars")
                .select("*")
                .eq("is_active", True)
                .order("created_at", desc=True)
                .execute()
            )
            if res.data:
                for item in res.data:
                    avatars_dict[item["id"]] = item
                    LOCAL_AVATARS_STORE[item["id"]] = item
        except Exception as exc:
            logger.warning("Supabase list avatars notice, using local store: %s", exc)

    return [AvatarResponse(**item) for item in avatars_dict.values()]


@router.get("/{avatar_id}", response_model=AvatarResponse)
def get_avatar(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific avatar."""
    db = get_supabase_admin_client()
    if db is not None:
        try:
            res = (
                db.table("avatars")
                .select("*")
                .eq("id", avatar_id)
                .eq("is_active", True)
                .execute()
            )
            if res.data:
                return AvatarResponse(**res.data[0])
        except Exception:
            pass

    if avatar_id in LOCAL_AVATARS_STORE and LOCAL_AVATARS_STORE[avatar_id].get("is_active", True):
        return AvatarResponse(**LOCAL_AVATARS_STORE[avatar_id])

    raise AvatarNotFoundError(avatar_id)


@router.patch("/{avatar_id}", response_model=AvatarResponse)
def update_avatar(
    avatar_id: str,
    payload: AvatarUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update avatar personality traits, bio, or name."""
    db = get_supabase_admin_client()
    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}

    if db is not None:
        try:
            res = db.table("avatars").update(update_data).eq("id", avatar_id).execute()
            if res.data:
                LOCAL_AVATARS_STORE[avatar_id] = res.data[0]
                return AvatarResponse(**res.data[0])
        except Exception:
            pass

    if avatar_id in LOCAL_AVATARS_STORE:
        LOCAL_AVATARS_STORE[avatar_id].update(update_data)
        return AvatarResponse(**LOCAL_AVATARS_STORE[avatar_id])

    raise AvatarNotFoundError(avatar_id)


@router.delete("/{avatar_id}", status_code=204)
def delete_avatar(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an avatar and purge from store."""
    db = get_supabase_admin_client()

    try:
        vector_service.delete_avatar_memories(avatar_id)
    except Exception:
        pass

    if db is not None:
        try:
            db.table("avatars").update({"is_active": False}).eq("id", avatar_id).execute()
        except Exception:
            pass

    if avatar_id in LOCAL_AVATARS_STORE:
        LOCAL_AVATARS_STORE[avatar_id]["is_active"] = False

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
    """Create a new avatar with photo portrait, ElevenLabs voice cloning, and initial memory."""
    db = get_supabase_admin_client()
    avatar_id = str(uuid.uuid4())

    # 1. Process portrait photo
    photo_bytes = await photo.read()
    if len(photo_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo file must be under 15MB.")

    content_type = photo.content_type or "image/jpeg"
    ext = "jpg" if "jpeg" in content_type or "jpg" in content_type else "png"
    storage_path = f"{current_user.get('id', 'demo-user-id')}/{avatar_id}/face.{ext}"

    photo_url = None
    if db is not None:
        try:
            storage = db.storage.from_("avatar-photos")
            storage.upload(
                path=storage_path,
                file=photo_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            photo_url = storage.get_public_url(storage_path)
        except Exception as st_err:
            logger.warning("Supabase storage upload notice: %s", st_err)

    if not photo_url:
        # Self-contained Data URI fallback
        b64_photo = base64.b64encode(photo_bytes).decode("utf-8")
        photo_url = f"data:{content_type};base64,{b64_photo}"

    persona_config = {
        "did_photo_url": photo_url,
    }

    # 2. Provision Anam.ai 16:9 Cara-4 digital avatar if configured
    try:
        anam_avatar_id = anam_service.create_avatar_from_photo(name, photo_url)
        persona_config["anam_avatar_id"] = anam_avatar_id
    except Exception as an_err:
        logger.warning("Anam avatar generation notice: %s", an_err)

    # 3. ElevenLabs Instant Voice Cloning
    voice_status = "none"
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
                voice_status = "cloned"

                try:
                    anam_voice_id = anam_service.import_elevenlabs_voice(el_voice_id)
                    persona_config["anam_voice_id"] = anam_voice_id
                    persona_config["anam_persona_voice_id"] = anam_voice_id
                except Exception as imp_err:
                    logger.warning("Anam voice import notice: %s", imp_err)
        except Exception as v_err:
            logger.error("Voice clone error: %s", v_err)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"ElevenLabs Instant Voice Cloning failed: {str(v_err)}",
            )

    # 4. Provision Anam Persona linked to avatar & voice if Anam is ready
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

    # 5. Insert avatar into database or local store
    data = {
        "id": avatar_id,
        "owner_id": current_user.get("id", "demo-user-id"),
        "name": name,
        "relationship": relationship,
        "subject_type": subject_type,
        "bio": bio or f"Beloved {relationship}",
        "personality_traits": ["warm", "caring", "attentive"],
        "catchphrases": [],
        "consent_status": "verified",
        "voice_status": voice_status,
        "photo_s3_key": photo_url,
        "memory_count": 1 if initial_memory else 0,
        "is_active": True,
        "persona_config": persona_config,
    }

    if db is not None:
        try:
            res = db.table("avatars").insert(data).execute()
            if res.data:
                data = res.data[0]
        except Exception as exc:
            logger.warning("Supabase save notice, stored locally: %s", exc)

    LOCAL_AVATARS_STORE[avatar_id] = data

    # 6. Ingest initial memory if provided
    if initial_memory and initial_memory.strip():
        try:
            memory_service.ingest_single_memory(
                user_id=current_user.get("id", "demo-user-id"),
                avatar_id=avatar_id,
                content=initial_memory.strip(),
                source_type="manual",
            )
        except Exception as m_err:
            logger.warning("Initial memory preservation notice: %s", m_err)

    return AvatarResponse(**data)


@router.post("/{avatar_id}/clone-voice")
async def clone_avatar_voice(
    avatar_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload an audio recording to clone voice in ElevenLabs for an existing avatar."""
    db = get_supabase_admin_client()
    avatar = None

    if db is not None:
        try:
            existing = db.table("avatars").select("*").eq("id", avatar_id).execute()
            if existing.data:
                avatar = existing.data[0]
        except Exception:
            pass

    if not avatar and avatar_id in LOCAL_AVATARS_STORE:
        avatar = LOCAL_AVATARS_STORE[avatar_id]

    if not avatar:
        avatar = {
            "id": avatar_id,
            "name": "Companion",
            "relationship": "Friend",
            "persona_config": {},
        }

    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio sample file is too small or empty. Please provide at least a few seconds of clean speech.",
        )

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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs voice clone failed: {str(el_err)}",
        )

    persona_config["elevenlabs_voice_id"] = el_voice_id
    persona_config["elevenlabs_voice_name"] = f"{name}'s Voice"

    # 2. Optional import into Anam.ai
    anam_voice_id = None
    try:
        anam_voice_id = anam_service.import_elevenlabs_voice(el_voice_id)
        persona_config["anam_voice_id"] = anam_voice_id
        persona_config["anam_persona_voice_id"] = anam_voice_id
    except Exception as an_err:
        logger.warning("Anam voice import notice: %s", an_err)

    # 3. Update in database and local store
    if db is not None:
        try:
            db.table("avatars").update({
                "persona_config": persona_config,
                "voice_status": "cloned",
            }).eq("id", avatar_id).execute()
        except Exception:
            pass

    if avatar_id not in LOCAL_AVATARS_STORE:
        LOCAL_AVATARS_STORE[avatar_id] = avatar
    LOCAL_AVATARS_STORE[avatar_id]["persona_config"] = persona_config
    LOCAL_AVATARS_STORE[avatar_id]["voice_status"] = "cloned"

    return {
        "success": True,
        "avatar_id": avatar_id,
        "elevenlabs_voice_id": el_voice_id,
        "anam_voice_id": anam_voice_id,
        "message": f"Successfully cloned and linked {name}'s voice!",
    }
