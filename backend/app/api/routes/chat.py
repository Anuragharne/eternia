"""API route handlers for Grounded Avatar Chat."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from backend.app.core.auth import get_current_user
from backend.app.models.schemas import ChatRequest, ChatResponse
from backend.app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
def send_message(
    payload: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send message to avatar, execute RAG retrieval, and return grounded response."""
    return chat_service.generate_chat_response(
        user_id=current_user["id"],
        avatar_id=payload.avatar_id,
        user_message=payload.message,
    )


@router.get("/{avatar_id}/history", response_model=List[Dict[str, Any]])
def get_chat_history(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get active session conversation turns from cache."""
    return chat_service.get_session_history(
        user_id=current_user["id"],
        avatar_id=avatar_id,
    )


@router.delete("/{avatar_id}/history", status_code=204)
def clear_chat_history(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Clear the active conversation buffer in session cache."""
    chat_service.clear_session_history(
        user_id=current_user["id"],
        avatar_id=avatar_id,
    )
    return None
