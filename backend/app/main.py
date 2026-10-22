"""Eternia AI Companion Backend Application Entrypoint."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.api.routes import api_router
from backend.app.core.config import settings
from backend.app.core.errors import AppError
from backend.app.services.vector_service import vector_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("eternia")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Initializing Eternia AI Companion backend...")
    try:
        # Verify and ensure Qdrant collection is ready
        vector_service.setup_collection()
        logger.info("Qdrant vector collection verified on startup.")
    except Exception as e:
        logger.warning(f"Could not verify Qdrant collection on startup: {e}")
    yield
    logger.info("Eternia backend shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Empathetic AI memory preservation and companion platform.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Custom Exception Handler
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "status": exc.status,
                "details": exc.details,
            }
        },
    )


@app.get("/health", tags=["Health"])
def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "Eternia AI Companion",
        "environment": settings.ENVIRONMENT,
    }


# Include all API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)
