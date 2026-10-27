import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from pydantic import BaseModel, Field

from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.services.voice_service import (
    VOICE_CATALOG,
    resolve_voice_for_avatar,
    voice_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice"])


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to speak")
    voice_id: Optional[str] = Field(None, description="Optional custom voice ID override")
    output_format: Optional[str] = Field("mp3", description="Audio format: mp3 or pcm_16000")


@router.get("/subscription")
async def get_voice_subscription():
    """Retrieve ElevenLabs subscription details and character credit quota."""
    try:
        return await voice_service.get_subscription_info()
    except Exception as exc:
        logger.error("Failed to fetch voice subscription: %s", exc)
        return {"configured": False, "error": str(exc)}


@router.get("/cloned")
async def get_cloned_voices():
    """Retrieve list of custom cloned voices in ElevenLabs account."""
    try:
        voices = await voice_service.get_cloned_voices()
        return {"voices": voices}
    except Exception as exc:
        logger.error("Failed to list cloned voices: %s", exc)
        return {"voices": [], "error": str(exc)}


@router.get("/catalog")
def get_voice_catalog(current_user: dict = Depends(get_current_user)):
    """Return the available voices catalog and relationship assignments."""
    return {
        "voices": VOICE_CATALOG,
        "default": "river",
    }


from backend.app.api.routes.avatars import LOCAL_AVATARS_STORE


def _get_avatar_record(avatar_id: str) -> dict:
    db = get_supabase_admin_client()
    if db is not None:
        try:
            res = db.table("avatars").select("*").eq("id", avatar_id).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass
    if avatar_id in LOCAL_AVATARS_STORE:
        return LOCAL_AVATARS_STORE[avatar_id]
    return {
        "id": avatar_id,
        "name": "Companion",
        "relationship": "Friend",
        "persona_config": {},
    }


@router.get("/{avatar_id}/info")
def get_avatar_voice_info(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve voice resolution info for a given avatar."""
    avatar = _get_avatar_record(avatar_id)
    voice_id, voice_name = resolve_voice_for_avatar(avatar)

    return {
        "avatar_id": avatar["id"],
        "avatar_name": avatar["name"],
        "relationship": avatar.get("relationship", ""),
        "voice_id": voice_id,
        "voice_name": voice_name,
        "is_cloned": bool((avatar.get("persona_config") or {}).get("elevenlabs_voice_id")),
    }


@router.post("/{avatar_id}/clone-voice")
async def clone_avatar_voice(
    avatar_id: str,
    file: UploadFile = File(..., description="Audio file sample (mp3, wav, m4a, ogg)"),
    voice_name: Optional[str] = Form(None, description="Custom name for the cloned voice"),
    current_user: dict = Depends(get_current_user),
):
    """Instant Voice Cloning: Clone a voice from uploaded audio and assign to companion."""
    avatar = _get_avatar_record(avatar_id)
    target_name = voice_name or f"{avatar['name']}'s Voice"

    try:
        audio_bytes = await file.read()
        if len(audio_bytes) < 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio sample file is too small or empty. Please provide a clear recording.",
            )

        clone_result = await voice_service.clone_voice(
            name=target_name,
            audio_bytes=audio_bytes,
            filename=file.filename or "sample.wav",
            description=f"Voice clone for {avatar['name']} on Eternia Sanctuary",
        )

        cloned_id = clone_result["voice_id"]

        # Persist cloned voice ID to avatar's persona_config
        persona_config = avatar.get("persona_config") or {}
        persona_config["elevenlabs_voice_id"] = cloned_id
        persona_config["elevenlabs_voice_name"] = target_name

        db = get_supabase_admin_client()
        if db is not None:
            try:
                db.table("avatars").update({"persona_config": persona_config}).eq("id", avatar_id).execute()
            except Exception:
                pass

        if avatar_id not in LOCAL_AVATARS_STORE:
            LOCAL_AVATARS_STORE[avatar_id] = avatar
        LOCAL_AVATARS_STORE[avatar_id]["persona_config"] = persona_config

        return {
            "success": True,
            "avatar_id": avatar_id,
            "voice_id": cloned_id,
            "voice_name": target_name,
            "message": f"Successfully cloned and linked voice for {avatar['name']}!",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Voice cloning failed for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs voice cloning failed: {str(exc)}",
        )


@router.post("/clone-standalone")
async def clone_voice_standalone(
    file: UploadFile = File(..., description="Audio recording sample"),
    name: str = Form(..., description="Name for the cloned voice"),
    current_user: dict = Depends(get_current_user),
):
    """Clone a voice directly via ElevenLabs IVC and return the new voice_id."""
    try:
        audio_bytes = await file.read()
        if len(audio_bytes) < 1000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio sample is too small. Please provide at least a few seconds of clean speech.",
            )

        clone_result = await voice_service.clone_voice(
            name=name,
            audio_bytes=audio_bytes,
            filename=file.filename or "sample.wav",
        )

        return {
            "success": True,
            "voice_id": clone_result["voice_id"],
            "voice_name": clone_result["name"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Standalone voice cloning failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs voice cloning failed: {str(exc)}",
        )


@router.get("/{avatar_id}/speak")
async def speak_text_get(
    avatar_id: str,
    text: str = Query(..., min_length=1, max_length=5000, description="Text to synthesize"),
    current_user: dict = Depends(get_current_user),
):
    """Synthesize speech using ElevenLabs for the given avatar's assigned relationship voice (GET)."""
    avatar = _get_avatar_record(avatar_id)
    voice_id, voice_name = resolve_voice_for_avatar(avatar)

    try:
        audio_bytes = await voice_service.synthesize(text=text, voice_id=voice_id)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="speech_{avatar_id[:8]}.mp3"',
                "X-Voice-Name": voice_name,
                "X-Voice-Id": voice_id,
            },
        )
    except Exception as exc:
        logger.error("TTS generation error for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs TTS service error: {str(exc)}",
        )


@router.post("/{avatar_id}/speak")
async def speak_text_post(
    avatar_id: str,
    payload: SpeakRequest,
    current_user: dict = Depends(get_current_user),
):
    """Synthesize speech using ElevenLabs for the given avatar's assigned relationship voice (POST)."""
    avatar = _get_avatar_record(avatar_id)
    voice_id, voice_name = resolve_voice_for_avatar(avatar)
    if payload.voice_id:
        voice_id = payload.voice_id

    try:
        is_pcm = payload.output_format == "pcm_16000"
        audio_bytes = await voice_service.synthesize(
            text=payload.text,
            voice_id=voice_id,
            output_format=payload.output_format,
        )
        media_type = "audio/pcm" if is_pcm else "audio/mpeg"
        filename = f"speech_{avatar_id[:8]}.pcm" if is_pcm else f"speech_{avatar_id[:8]}.mp3"
        return Response(
            content=audio_bytes,
            media_type=media_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "X-Voice-Name": voice_name,
                "X-Voice-Id": voice_id,
            },
        )
    except Exception as exc:
        logger.error("TTS generation error for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ElevenLabs TTS service error: {str(exc)}",
        )
