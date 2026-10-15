"""
Memory management routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials
from typing import List

from app.core.auth import security, verify_token
from app.models.schemas import MemoryCreate, MemoryResponse


router = APIRouter()


@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def add_memory(
    memory: MemoryCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Add a new memory to an avatar's knowledge store.
    
    The memory goes through the ingestion pipeline:
    1. Text is parsed and cleaned
    2. Entities, relationships, and dates are extracted via LLM
    3. Text is chunked and embedded
    4. Vectors are stored in Qdrant with metadata
    5. Confidence score is assigned based on source quality
    """
    user = await verify_token(credentials)

    # TODO: Implement memory ingestion pipeline
    # 1. Verify user owns the avatar
    # 2. Parse and clean content
    # 3. LLM extraction (entities, dates, emotions)
    # 4. Chunk → embed → store in Qdrant
    # 5. Store metadata in Supabase

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Memory ingestion pipeline will be implemented in Month 2",
    )


@router.get("/{avatar_id}", response_model=List[MemoryResponse])
async def list_memories(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    skip: int = 0,
    limit: int = 50,
):
    """List all memories for a specific avatar, paginated."""
    user = await verify_token(credentials)

    # TODO: Query Supabase for memories, verify avatar ownership
    return []


@router.post("/{avatar_id}/import")
async def import_memories(
    avatar_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Bulk import memories from a file.
    
    Supported formats:
    - .txt (plain text journal)
    - .pdf (scanned journals, letters)
    - .json (structured memory export)
    - WhatsApp chat export (.txt format)
    """
    user = await verify_token(credentials)

    allowed_types = [
        "text/plain", "application/pdf", "application/json",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    
    # Also accept by extension since MIME types can be unreliable
    allowed_extensions = [".txt", ".pdf", ".json", ".docx"]
    file_ext = "." + file.filename.split(".")[-1].lower() if file.filename else ""
    
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File format not supported. Use TXT, PDF, JSON, or DOCX.",
        )

    # TODO:
    # 1. Parse file based on type
    # 2. Split into individual memories
    # 3. Run each through the ingestion pipeline
    # 4. Return summary of imported memories

    return {
        "status": "processing",
        "message": "File received. Memories will be processed in the background.",
    }


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Delete a specific memory and its vector embeddings."""
    user = await verify_token(credentials)

    # TODO: Delete from Qdrant + Supabase
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Will be implemented with memory pipeline",
    )
