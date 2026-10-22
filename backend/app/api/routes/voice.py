"""API route handlers for ElevenLabs Voice synthesis."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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


@router.get("/catalog")
def get_voice_catalog(current_user: dict = Depends(get_current_user)):
    """Return the available voices catalog and relationship assignments."""
    return {
        "voices": VOICE_CATALOG,
        "default": "river",
    }


@router.get("/{avatar_id}/info")
def get_avatar_voice_info(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve voice resolution info for a given avatar."""
    db = get_supabase_admin_client()
    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    voice_id, voice_name = resolve_voice_for_avatar(avatar)

    return {
        "avatar_id": avatar["id"],
        "avatar_name": avatar["name"],
        "relationship": avatar.get("relationship", ""),
        "voice_id": voice_id,
        "voice_name": voice_name,
    }


@router.get("/{avatar_id}/speak")
async def speak_text_get(
    avatar_id: str,
    text: str = Query(..., min_length=1, max_length=5000, description="Text to synthesize"),
    current_user: dict = Depends(get_current_user),
):
    """Synthesize speech using ElevenLabs for the given avatar's assigned relationship voice (GET)."""
    db = get_supabase_admin_client()
    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
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
    db = get_supabase_admin_client()
    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    voice_id, voice_name = resolve_voice_for_avatar(avatar)
    if payload.voice_id:
        voice_id = payload.voice_id

    try:
        audio_bytes = await voice_service.synthesize(text=payload.text, voice_id=voice_id)
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
