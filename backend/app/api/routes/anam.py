"""API endpoints for Anam.ai live interactive avatar streaming."""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from backend.app.services.anam_service import anam_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/anam", tags=["Anam Live Avatar"])


class AnamSessionRequest(BaseModel):
    avatar_id: str = Field(..., description="ID of the avatar to stream")


class AnamSessionResponse(BaseModel):
    sessionToken: str
    personaId: str
    avatarId: str
    anamAvatarId: Optional[str] = None
    name: Optional[str] = None


@router.post("/session-token", response_model=AnamSessionResponse)
def get_anam_session_token(payload: AnamSessionRequest):
    """Generate an Anam.ai WebRTC streaming session token for the avatar."""
    try:
        session_data = anam_service.create_session_token(avatar_id=payload.avatar_id)
        return AnamSessionResponse(**session_data)
    except Exception as exc:
        logger.error("Anam session token endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
