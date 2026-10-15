"""
Chat routes — conversation with the AI avatar.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from app.core.auth import security, verify_token
from app.models.schemas import ChatRequest, ChatResponse


router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Send a message to an avatar and get a grounded response.
    
    The conversation pipeline:
    1. Verify user has access to this avatar
    2. Load session context from Redis (last 20 turns)
    3. Transform query (HyDE + entity extraction)
    4. Hybrid retrieval from Qdrant (vector + BM25)
    5. Rerank and confidence-gate retrieved memories
    6. Assemble system prompt (persona + grounding rules + memories)
    7. Generate response via Gemini Flash
    8. Self-verify: check response is grounded in retrieved context
    9. Update session memory in Redis
    10. Return response with grounding metadata
    """
    user = await verify_token(credentials)

    # TODO: Implement full conversation pipeline (Month 3)
    # For now, return a placeholder
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Chat engine will be implemented in Month 3",
    )


@router.get("/{avatar_id}/history")
async def get_chat_history(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    limit: int = 50,
):
    """
    Get recent chat history for an avatar.
    
    Chat history is ephemeral by default (stored in Redis session).
    Users can opt-in to persistent history (stored in Supabase).
    """
    user = await verify_token(credentials)

    # TODO: Fetch from Redis (session) or Supabase (persisted)
    return {"messages": [], "has_more": False}


@router.delete("/{avatar_id}/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Clear all chat history for an avatar."""
    user = await verify_token(credentials)

    # TODO: Clear Redis session + Supabase history
    return
