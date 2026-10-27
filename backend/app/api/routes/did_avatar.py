"""API route handlers for D-ID talking avatar video generation."""

import datetime
import logging
import re
import uuid
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field

from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.services.did_service import did_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/did-avatar", tags=["D-ID Avatar"])


async def _persist_video_to_supabase(db, user_id: str, avatar_id: str, temp_video_url: str) -> str:
    """Download temporary D-ID video (expires in 24h) and store permanently in Supabase Storage."""
    if not temp_video_url:
        return temp_video_url
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(temp_video_url)
            if resp.status_code == 200:
                storage_path = f"{user_id}/{avatar_id}/latest_talk.mp4"
                storage = db.storage.from_("avatar-photos")
                try:
                    storage.remove([storage_path])
                except Exception:
                    pass
                storage.upload(
                    path=storage_path,
                    file=resp.content,
                    file_options={"content-type": "video/mp4", "upsert": "true"},
                )
                permanent_url = storage.get_public_url(storage_path)
                logger.info("Persisted D-ID talk video permanently to Supabase Storage: %s", permanent_url)
                return permanent_url
    except Exception as exc:
        logger.warning("Could not persist video to Supabase Storage, using direct URL: %s", exc)
    return temp_video_url


# ─── Request / Response Schemas ───────────────────────────────────────────────

class GenerateTalkRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500, description="Text for the avatar to speak")
    voice_provider: str = Field("microsoft", description="TTS provider: microsoft, amazon, elevenlabs")
    voice_id: str = Field("en-US-JennyNeural", description="Voice ID for the provider")


class GenerateTalkResponse(BaseModel):
    video_url: str
    talk_id: str
    duration_estimate: Optional[float] = None


class AvatarPhotoResponse(BaseModel):
    avatar_id: str
    photo_url: str
    video_url: Optional[str] = None
    message: str


class CreditsResponse(BaseModel):
    remaining: str
    total: str


class IntroVideoResponse(BaseModel):
    avatar_id: str
    intro_video_url: Optional[str] = None
    photo_url: Optional[str] = None
    has_intro: bool


class GenerateIntroResponse(BaseModel):
    avatar_id: str
    video_url: str
    cached: bool
    message: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/{avatar_id}/upload-photo", response_model=AvatarPhotoResponse)
async def upload_avatar_photo(
    avatar_id: str,
    file: UploadFile = File(..., description="Face photo for the avatar (JPG/PNG, clear front-facing)"),
    generate_intro: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Upload a face photo for an avatar. Stored in Supabase Storage.

    The photo must be:
    - Clear, front-facing portrait
    - JPG or PNG format
    - At least 256x256 pixels (512x512+ recommended)
    - Well-lit with minimal obstructions

    Note: Requires the 'avatar-photos' bucket in Supabase Storage:
    -- INSERT INTO storage.buckets (id, name, public) VALUES ('avatar-photos', 'avatar-photos', true);
    """
    db = get_supabase_admin_client()

    # Verify avatar exists and user owns it
    res = db.table("avatars").select("owner_id, name").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)
    if res.data[0]["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{file.content_type}'. Must be JPG or PNG.",
        )

    # Read file bytes
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo must be under 10MB.",
        )

    # Generate unique filename
    ext = "jpg" if "jpeg" in (file.content_type or "") or "jpg" in (file.content_type or "") else "png"
    storage_path = f"{current_user['id']}/{avatar_id}/face.{ext}"

    # Upload to Supabase Storage
    try:
        storage = db.storage.from_("avatar-photos")

        # Delete existing photo if any (overwrite)
        try:
            storage.remove([storage_path])
        except Exception:
            pass  # File might not exist yet

        storage.upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type, "upsert": "true"},
        )

        # Get public URL
        public_url = storage.get_public_url(storage_path)

        # Update avatar record with photo reference
        # First fetch existing persona_config to merge
        existing = db.table("avatars").select("persona_config").eq("id", avatar_id).execute()
        existing_config = (existing.data[0].get("persona_config") or {}) if existing.data else {}
        existing_config["did_photo_url"] = public_url

        # Optionally auto-generate initial talking avatar video greeting immediately!
        video_url = None
        if generate_intro:
            try:
                avatar_name = res.data[0].get("name") or "there"
                greeting = f"Hello! It is so wonderful to see you. I am {avatar_name}. What would you like to talk about today?"
                video_url = await did_service.generate_talk_video(
                    source_url=public_url,
                    text=greeting,
                )
                existing_config["latest_video_url"] = video_url
            except Exception as vid_err:
                logger.warning("Auto-generating intro video failed during upload: %s", vid_err)

        db.table("avatars").update({
            "photo_s3_key": storage_path,
            "persona_config": existing_config,
        }).eq("id", avatar_id).execute()

        logger.info("Avatar photo uploaded: %s -> %s (video: %s)", avatar_id, storage_path, bool(video_url))

        return AvatarPhotoResponse(
            avatar_id=avatar_id,
            photo_url=public_url,
            video_url=video_url,
            message="Photo uploaded successfully. Your avatar is ready for video generation.",
        )

    except Exception as exc:
        logger.error("Photo upload failed for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo: {str(exc)}",
        )


@router.get("/{avatar_id}/photo-url")
async def get_avatar_photo_url(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the public URL of an avatar's uploaded face photo and latest video."""
    db = get_supabase_admin_client()

    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    persona_config = avatar.get("persona_config") or {}
    photo_url = persona_config.get("did_photo_url")

    if not photo_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No photo uploaded for this avatar. Upload one via POST /did-avatar/{id}/upload-photo",
        )

    video_url = persona_config.get("latest_video_url")
    # If the video_url is a temporary D-ID AWS S3 link older than 24h, expire it safely
    if video_url and "d-id-talks-prod.s3" in video_url:
        match = re.search(r"X-Amz-Date=(\d{8})T", video_url)
        if match:
            try:
                url_date = datetime.datetime.strptime(match.group(1), "%Y%m%d").date()
                if (datetime.date.today() - url_date).days >= 1:
                    logger.info("Expiring stale 24h temporary D-ID video for avatar %s", avatar_id)
                    video_url = None
                    existing_config = dict(persona_config)
                    existing_config.pop("latest_video_url", None)
                    db.table("avatars").update({"persona_config": existing_config}).eq("id", avatar_id).execute()
            except Exception:
                pass

    return {
        "avatar_id": avatar_id,
        "photo_url": photo_url,
        "video_url": video_url,
    }


@router.get("/{avatar_id}/intro-video", response_model=IntroVideoResponse)
async def get_intro_video(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the cached intro video URL for an avatar, if one exists."""
    db = get_supabase_admin_client()
    res = db.table("avatars").select("persona_config").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    persona_config = res.data[0].get("persona_config") or {}
    photo_url = persona_config.get("did_photo_url")
    intro_video_url = persona_config.get("intro_video_url")

    # If it was an old temp D-ID AWS URL, invalidate it
    if intro_video_url and "d-id-talks-prod.s3" in intro_video_url:
        intro_video_url = None

    return IntroVideoResponse(
        avatar_id=avatar_id,
        intro_video_url=intro_video_url,
        photo_url=photo_url,
        has_intro=bool(intro_video_url),
    )


@router.post("/{avatar_id}/generate-intro", response_model=GenerateIntroResponse)
async def generate_intro_video(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate and permanently cache the avatar's intro video. Idempotent — returns cached video if one exists."""
    db = get_supabase_admin_client()

    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    if avatar["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    persona_config = avatar.get("persona_config") or {}
    photo_url = persona_config.get("did_photo_url")

    if not photo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face photo uploaded. Upload one first via POST /did-avatar/{id}/upload-photo",
        )

    # Check if we already have a cached permanent intro video
    existing_intro = persona_config.get("intro_video_url")
    if existing_intro and "d-id-talks-prod.s3" not in existing_intro:
        logger.info("Returning cached intro video for avatar %s: %s", avatar_id, existing_intro)
        return GenerateIntroResponse(
            avatar_id=avatar_id,
            video_url=existing_intro,
            cached=True,
            message="Intro video already exists. Playing cached version.",
        )

    # Generate new intro video
    avatar_name = avatar.get("name") or "there"
    greeting = f"Hello! It is so wonderful to see you. I am {avatar_name}. What would you like to talk about today?"

    try:
        raw_video_url = await did_service.generate_talk_video(
            source_url=photo_url,
            text=greeting,
        )

        intro_storage_path = f"{current_user['id']}/{avatar_id}/intro_talk.mp4"
        permanent_url = raw_video_url
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.get(raw_video_url)
                if resp.status_code == 200:
                    storage = db.storage.from_("avatar-photos")
                    try:
                        storage.remove([intro_storage_path])
                    except Exception:
                        pass
                    storage.upload(
                        path=intro_storage_path,
                        file=resp.content,
                        file_options={"content-type": "video/mp4", "upsert": "true"},
                    )
                    permanent_url = storage.get_public_url(intro_storage_path)
                    logger.info("Persisted intro talk video to Supabase Storage: %s", permanent_url)
        except Exception as exc:
            logger.warning("Could not persist intro video to storage: %s", exc)

        persona_config["intro_video_url"] = permanent_url
        db.table("avatars").update({"persona_config": persona_config}).eq("id", avatar_id).execute()

        return GenerateIntroResponse(
            avatar_id=avatar_id,
            video_url=permanent_url,
            cached=False,
            message="Intro video generated and cached permanently.",
        )

    except TimeoutError as exc:
        logger.error("D-ID intro video timed out for %s: %s", avatar_id, exc)
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="Video generation timed out.")
    except Exception as exc:
        logger.error("D-ID intro video error for %s: %s", avatar_id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Video generation failed: {str(exc)}")


@router.post("/{avatar_id}/generate-talk", response_model=GenerateTalkResponse)
async def generate_talking_video(
    avatar_id: str,
    payload: GenerateTalkRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate a talking avatar video for the given text.

    Flow: Fetches avatar photo URL → sends to D-ID → polls completion → saves to Supabase Storage → returns permanent URL.
    """
    db = get_supabase_admin_client()

    # Fetch avatar and verify ownership
    res = db.table("avatars").select("*").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)

    avatar = res.data[0]
    if avatar["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    # Get photo URL from persona_config
    persona_config = avatar.get("persona_config") or {}
    photo_url = persona_config.get("did_photo_url")

    if not photo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face photo uploaded for this avatar. Upload one first via POST /did-avatar/{id}/upload-photo",
        )

    try:
        raw_video_url = await did_service.generate_talk_video(
            source_url=photo_url,
            text=payload.text,
            voice_provider=payload.voice_provider,
            voice_id=payload.voice_id,
        )

        # Download & store video permanently into Supabase Storage so it never expires
        video_url = await _persist_video_to_supabase(
            db=db,
            user_id=current_user["id"],
            avatar_id=avatar_id,
            temp_video_url=raw_video_url,
        )

        # Cache permanent video URL in persona_config for persistence
        existing = db.table("avatars").select("persona_config").eq("id", avatar_id).execute()
        existing_config = (existing.data[0].get("persona_config") or {}) if existing.data else {}
        existing_config["latest_video_url"] = video_url
        db.table("avatars").update({"persona_config": existing_config}).eq("id", avatar_id).execute()

        return GenerateTalkResponse(
            video_url=video_url,
            talk_id=avatar_id,
        )

    except TimeoutError as exc:
        logger.error("D-ID video generation timed out for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Avatar video generation timed out. Please try again.",
        )
    except Exception as exc:
        logger.error("D-ID video generation error for avatar %s: %s", avatar_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"D-ID video generation failed: {str(exc)}",
        )


@router.get("/credits", response_model=CreditsResponse)
async def get_did_credits(
    current_user: dict = Depends(get_current_user),
):
    """Check remaining D-ID API credits."""
    try:
        credits = await did_service.get_remaining_credits()
        return CreditsResponse(
            remaining=str(credits.get("remaining", "unknown")),
            total=str(credits.get("total", "unknown")),
        )
    except Exception as exc:
        logger.warning("Could not fetch D-ID credits: %s", exc)
        return CreditsResponse(remaining="unknown", total="unknown")
