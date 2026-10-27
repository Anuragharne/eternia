"""API routes for Simli Live Interactive Avatar WebRTC streaming."""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.simli_service import simli_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simli", tags=["Simli"])


class SimliTokenRequest(BaseModel):
    avatar_id: Optional[str] = None
    face_id: Optional[str] = None


class SimliTokenResponse(BaseModel):
    session_token: str
    face_id: str
    aspect_ratio: str
    width: int
    height: int
    warnings: Optional[List[str]] = []


@router.post("/token", response_model=SimliTokenResponse)
def get_simli_token(payload: SimliTokenRequest = SimliTokenRequest()):
    """Generate a 16:9 WebRTC streaming session token from Simli."""
    try:
        token_data = simli_service.create_session_token(face_id=payload.face_id)
        return SimliTokenResponse(**token_data)
    except Exception as exc:
        logger.error("Simli token endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/faces")
def get_simli_faces() -> List[Dict[str, Any]]:
    """Retrieve available Simli faces and character presets."""
    return simli_service.list_available_faces()
