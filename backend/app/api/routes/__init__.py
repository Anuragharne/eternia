"""API route router aggregation."""

from fastapi import APIRouter
from backend.app.api.routes.avatars import router as avatars_router
from backend.app.api.routes.memories import router as memories_router
from backend.app.api.routes.chat import router as chat_router
from backend.app.api.routes.consent import router as consent_router
from backend.app.api.routes.export import router as export_router
from backend.app.api.routes.voice import router as voice_router
from backend.app.api.routes.did_avatar import router as did_avatar_router
from backend.app.api.routes.simli import router as simli_router
from backend.app.api.routes.anam import router as anam_router

api_router = APIRouter()
api_router.include_router(avatars_router)
api_router.include_router(memories_router)
api_router.include_router(chat_router)
api_router.include_router(consent_router)
api_router.include_router(export_router)
api_router.include_router(voice_router)
api_router.include_router(did_avatar_router)
api_router.include_router(simli_router)
api_router.include_router(anam_router)

__all__ = ["api_router"]
