"""
API router — aggregates all route modules.
"""
from fastapi import APIRouter
from app.api.routes import avatars, memories, chat, consent

router = APIRouter()

router.include_router(avatars.router, prefix="/avatars", tags=["Avatars"])
router.include_router(memories.router, prefix="/memories", tags=["Memories"])
router.include_router(chat.router, prefix="/chat", tags=["Chat"])
router.include_router(consent.router, prefix="/consent", tags=["Consent"])
