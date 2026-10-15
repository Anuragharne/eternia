"""
Avatar management routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from typing import List

from app.core.auth import security, verify_token
from app.models.schemas import AvatarCreate, AvatarResponse


router = APIRouter()


@router.post("/", response_model=AvatarResponse, status_code=status.HTTP_201_CREATED)
async def create_avatar(
    avatar_data: AvatarCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Create a new avatar.
    
    - For living subjects: the subject must be the authenticated user (self-creation only).
    - For deceased subjects: the authenticated user is the family member creating on behalf.
    """
    user = await verify_token(credentials)
    user_id = user["sub"]

    # TODO: Implement avatar creation in Supabase
    # 1. Insert avatar record
    # 2. Create consent record (pending)
    # 3. Initialize empty Qdrant namespace

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Avatar creation will be implemented with Supabase integration",
    )


@router.get("/", response_model=List[AvatarResponse])
async def list_avatars(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """List all avatars owned by the authenticated user."""
    user = await verify_token(credentials)
    user_id = user["sub"]

    # TODO: Query Supabase for user's avatars
    return []


@router.get("/{avatar_id}", response_model=AvatarResponse)
async def get_avatar(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get a specific avatar by ID."""
    user = await verify_token(credentials)

    # TODO: Fetch avatar from Supabase, verify ownership
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Will be implemented with Supabase integration",
    )


@router.post("/{avatar_id}/photo")
async def upload_photo(
    avatar_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Upload a reference photo for the avatar.
    
    Accepted formats: JPEG, PNG, WebP.
    The photo is encrypted (AES-256) and stored in S3.
    """
    user = await verify_token(credentials)

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, or WebP.",
        )

    # TODO: 
    # 1. Read file bytes
    # 2. Encrypt with AES-256-GCM
    # 3. Upload to S3 with user_id/avatar_id prefix
    # 4. Run face detection to validate a face is present
    # 5. Update avatar record with photo_url

    return {"status": "uploaded", "message": "Photo uploaded successfully"}


@router.post("/{avatar_id}/voice")
async def upload_voice(
    avatar_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Upload a voice reference recording for the avatar.
    
    Accepted formats: WAV, MP3, M4A, OGG, WebM.
    Minimum 5 seconds of clear speech required.
    """
    user = await verify_token(credentials)

    allowed_types = [
        "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
        "audio/mp4", "audio/m4a", "audio/ogg", "audio/webm",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio format {file.content_type} not supported.",
        )

    # TODO:
    # 1. Read file bytes
    # 2. Transcode to WAV if needed
    # 3. Validate minimum duration (5s)
    # 4. Noise reduction preprocessing
    # 5. Encrypt and upload to S3
    # 6. Extract speaker embedding (V1.1: send to ElevenLabs)
    # 7. Update avatar voice_status to "cloned"

    return {"status": "uploaded", "message": "Voice recording uploaded successfully"}


@router.delete("/{avatar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Delete an avatar and ALL associated data.
    
    This permanently removes:
    - All photos and voice recordings from S3
    - All memory vectors from Qdrant
    - All database records
    - The consent audit log is RETAINED for compliance.
    """
    user = await verify_token(credentials)

    # TODO: Implement cascading deletion
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Will be implemented with Supabase integration",
    )
