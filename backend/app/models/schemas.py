"""
Pydantic models for request/response schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ============================================================
# Auth
# ============================================================

class UserProfile(BaseModel):
    """User profile returned after authentication."""
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime


# ============================================================
# Avatars
# ============================================================

class AvatarCreate(BaseModel):
    """Request to create a new avatar."""
    name: str = Field(..., min_length=1, max_length=100, description="Name of the person")
    relationship: str = Field(..., description="User's relationship to this person (e.g., 'Mother', 'Father', 'Friend')")
    subject_type: Literal["living", "deceased"] = Field(..., description="Whether the subject is living or deceased")
    bio: Optional[str] = Field(None, max_length=2000, description="Brief description of the person")
    personality_traits: Optional[List[str]] = Field(None, description="Key personality traits")
    catchphrases: Optional[List[str]] = Field(None, description="Common phrases or sayings")


class AvatarResponse(BaseModel):
    """Avatar data returned to the client."""
    id: str
    name: str
    relationship: str
    subject_type: str
    bio: Optional[str] = None
    personality_traits: List[str] = []
    catchphrases: List[str] = []
    photo_url: Optional[str] = None
    voice_status: Literal["none", "placeholder", "cloned"] = "none"
    consent_status: Literal["pending", "verified", "revoked"] = "pending"
    memory_count: int = 0
    created_at: datetime
    updated_at: datetime


# ============================================================
# Memories
# ============================================================

class MemoryCreate(BaseModel):
    """Request to add a new memory."""
    avatar_id: str
    content: str = Field(..., min_length=1, max_length=10000, description="The memory text content")
    source_type: Literal["manual", "journal", "chat_export", "photo_caption", "voice_transcript"] = "manual"
    memory_date: Optional[datetime] = Field(None, description="When this memory occurred")
    tags: Optional[List[str]] = Field(None, description="Optional tags for categorization")


class MemoryResponse(BaseModel):
    """Memory data returned to the client."""
    id: str
    avatar_id: str
    content: str
    source_type: str
    memory_date: Optional[datetime] = None
    tags: List[str] = []
    confidence_score: float = 1.0
    created_at: datetime


# ============================================================
# Chat
# ============================================================

class ChatMessage(BaseModel):
    """A single chat message."""
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime


class ChatRequest(BaseModel):
    """Request to send a message to an avatar."""
    avatar_id: str
    message: str = Field(..., min_length=1, max_length=5000)


class ChatResponse(BaseModel):
    """Response from the avatar."""
    avatar_id: str
    message: str
    grounded: bool = Field(..., description="Whether the response is grounded in retrieved memories")
    memories_used: int = Field(0, description="Number of memories retrieved for this response")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Response confidence score")


# ============================================================
# Consent
# ============================================================

class ConsentCreate(BaseModel):
    """Record consent for avatar creation."""
    avatar_id: str
    consent_type: Literal["self", "family_attestation"]
    relationship_proof: Optional[str] = Field(None, description="Description of relationship proof provided")
    acknowledged_ai_disclaimer: bool = Field(..., description="User acknowledges this is AI, not the real person")
    acknowledged_data_usage: bool = Field(..., description="User acknowledges how data will be used")


class ConsentResponse(BaseModel):
    """Consent record."""
    id: str
    avatar_id: str
    consent_type: str
    status: Literal["pending", "verified", "revoked"]
    granted_at: datetime
    ip_address: Optional[str] = None
