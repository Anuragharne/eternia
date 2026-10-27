"""Pydantic schemas for request and response models."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, UUID4


# ============================================================
# AVATAR SCHEMAS
# ============================================================
class AvatarBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    relationship: str = Field(..., min_length=1, max_length=100)
    subject_type: Literal["living", "deceased"] = "deceased"
    bio: Optional[str] = Field(None, max_length=2000)
    personality_traits: List[str] = Field(default_factory=list)
    catchphrases: List[str] = Field(default_factory=list)


class AvatarCreate(AvatarBase):
    pass


class AvatarUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    relationship: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=2000)
    personality_traits: Optional[List[str]] = None
    catchphrases: Optional[List[str]] = None


class AvatarResponse(AvatarBase):
    id: str
    owner_id: str
    voice_status: Literal["none", "placeholder", "cloned"] = "none"
    consent_status: Literal["pending", "verified", "revoked"] = "pending"
    photo_s3_key: Optional[str] = None
    voice_s3_key: Optional[str] = None
    memory_count: int = 0
    persona_config: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============================================================
# MEMORY SCHEMAS
# ============================================================
class MemoryCreate(BaseModel):
    avatar_id: str
    content: str = Field(..., min_length=1, max_length=10000)
    source_type: Literal[
        "manual", "journal", "chat_export",
        "photo_caption", "voice_transcript", "user_contributed"
    ] = "manual"
    memory_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)


class MemoryResponse(BaseModel):
    id: str
    avatar_id: str
    uploaded_by: str
    content: str
    source_type: str
    memory_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    confidence_score: float = 1.0
    qdrant_point_id: Optional[str] = None
    extracted_entities: List[str] = Field(default_factory=list)
    extracted_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


class MemoryStatsResponse(BaseModel):
    avatar_id: str
    total_memories: int
    source_breakdown: Dict[str, int]


# ============================================================
# CHAT SCHEMAS
# ============================================================
class ChatRequest(BaseModel):
    avatar_id: str
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    message: str
    is_grounded: bool = True
    memories_used: int = 0
    confidence_score: float = 1.0
    memory_ids_cited: List[str] = Field(default_factory=list)
    video_url: Optional[str] = None


# ============================================================
# CONSENT SCHEMAS
# ============================================================
class ConsentCreate(BaseModel):
    avatar_id: str
    consent_type: Literal["self", "family_attestation", "revocation"] = "self"
    consent_tier: Literal["text", "voice", "full_avatar"] = "text"
    relationship_proof: Optional[str] = None
    ack_ai_disclaimer: bool = True
    ack_data_usage: bool = True


class ConsentResponse(BaseModel):
    id: str
    avatar_id: str
    granted_by: str
    consent_type: str
    consent_tier: str
    status: Literal["pending", "verified", "revoked"]
    cooling_period_ends: Optional[datetime] = None
    granted_at: Optional[datetime] = None


# ============================================================
# ERROR ENVELOPE
# ============================================================
class ErrorDetail(BaseModel):
    code: str
    message: str
    status: int
    details: Dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
