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
    custom_face_status: Optional[str] = "none"
    warnings: Optional[List[str]] = []


@router.post("/token", response_model=SimliTokenResponse)
def get_simli_token(payload: SimliTokenRequest = SimliTokenRequest()):
    """Generate a 16:9 WebRTC streaming session token from Simli."""
    try:
        token_data = simli_service.create_session_token(
            face_id=payload.face_id,
            avatar_id=payload.avatar_id,
        )
        return SimliTokenResponse(**token_data)
    except Exception as exc:
        logger.error("Simli token endpoint error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/status/{avatar_id}")
def get_avatar_simli_status(avatar_id: str) -> Dict[str, Any]:
    """Check custom avatar face training status on Simli."""
    from backend.app.models.database import get_supabase_admin_client
    db = get_supabase_admin_client()
    res = db.table("avatars").select("persona_config, name").eq("id", avatar_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    cfg = res.data[0].get("persona_config") or {}
    simli_face = cfg.get("simli_face_id")
    status = "none"
    if simli_face:
        status = simli_service.check_face_status(simli_face)
        if status != cfg.get("simli_status"):
            cfg["simli_status"] = status
            db.table("avatars").update({"persona_config": cfg}).eq("id", avatar_id).execute()

    return {
        "avatar_id": avatar_id,
        "simli_face_id": simli_face,
        "status": status,
    }


@router.get("/faces")
def get_simli_faces() -> List[Dict[str, Any]]:
    """Retrieve available Simli faces and character presets."""
    return simli_service.list_available_faces()
