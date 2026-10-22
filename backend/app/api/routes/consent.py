"""API route handlers for Consent and Ethical Compliance."""

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from backend.app.core.auth import get_current_user
from backend.app.core.errors import AvatarNotFoundError, ForbiddenError
from backend.app.models.database import get_supabase_admin_client
from backend.app.models.schemas import ConsentCreate, ConsentResponse
from backend.app.services.vector_service import vector_service

router = APIRouter(prefix="/consent", tags=["Consent"])


@router.post("", response_model=ConsentResponse, status_code=201)
def record_consent(
    payload: ConsentCreate,
    current_user: dict = Depends(get_current_user),
):
    """Record consent log (append-only) and verify avatar."""
    db = get_supabase_admin_client()

    # Verify avatar exists and user owns it
    res = db.table("avatars").select("*").eq("id", payload.avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(payload.avatar_id)

    avatar = res.data[0]
    if avatar["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    log_id = str(uuid.uuid4())
    status = "verified"

    # Insert into append-only consent_logs table
    consent_data = {
        "id": log_id,
        "avatar_id": payload.avatar_id,
        "granted_by": current_user["id"],
        "consent_type": payload.consent_type,
        "consent_tier": payload.consent_tier,
        "relationship_proof": payload.relationship_proof,
        "ack_ai_disclaimer": payload.ack_ai_disclaimer,
        "ack_data_usage": payload.ack_data_usage,
        "status": status,
        "granted_at": datetime.utcnow().isoformat(),
    }
    log_res = db.table("consent_logs").insert(consent_data).execute()

    # Update avatar status
    db.table("avatars").update({"consent_status": "verified"}).eq("id", payload.avatar_id).execute()

    return ConsentResponse(**log_res.data[0])


@router.get("/{avatar_id}", response_model=ConsentResponse)
def get_consent_status(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve the latest verified consent log for an avatar."""
    db = get_supabase_admin_client()
    res = (
        db.table("consent_logs")
        .select("*")
        .eq("avatar_id", avatar_id)
        .order("granted_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="No consent record found for this avatar.")

    return ConsentResponse(**res.data[0])


@router.post("/{avatar_id}/revoke")
def revoke_consent(
    avatar_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Revoke consent: deactivate avatar, delete vectors, and record revocation log."""
    db = get_supabase_admin_client()
    res = db.table("avatars").select("owner_id").eq("id", avatar_id).execute()
    if not res.data:
        raise AvatarNotFoundError(avatar_id)
    if res.data[0]["owner_id"] != current_user["id"]:
        raise ForbiddenError("You do not own this avatar.")

    # 1. Insert revocation log
    log_id = str(uuid.uuid4())
    db.table("consent_logs").insert({
        "id": log_id,
        "avatar_id": avatar_id,
        "granted_by": current_user["id"],
        "consent_type": "revocation",
        "consent_tier": "full_avatar",
        "status": "revoked",
        "granted_at": datetime.utcnow().isoformat(),
    }).execute()

    # 2. Update avatar status
    db.table("avatars").update({
        "consent_status": "revoked",
        "is_active": False,
    }).eq("id", avatar_id).execute()

    # 3. Purge vector embeddings
    vector_service.delete_avatar_memories(avatar_id)

    return {"status": "revoked", "data_deletion": "initiated"}
