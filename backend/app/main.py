"""
Eternia Backend — FastAPI Application
AI Companion Platform
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import router as api_router


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        description="AI Companion Platform — Preserve and interact with the memories of loved ones.",
        version="0.1.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_router, prefix="/api")

    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "service": settings.APP_NAME}

    return app


app = create_app()
