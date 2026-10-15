"""
Consent management routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.core.auth import security, verify_token
from app.models.schemas import ConsentCreate, ConsentResponse


router = APIRouter()


@router.post("/", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def record_consent(
    consent: ConsentCreate,
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Record consent for avatar creation.
    
    Consent is stored in an immutable, append-only audit log.
    Each consent record captures:
    - Timestamp
    - IP address
    - User agent
    - Consent type (self or family attestation)
    - What was acknowledged
    
    For living subjects (consent_type="self"):
    - The authenticated user IS the subject
    - Email/SMS verification required
    
    For deceased subjects (consent_type="family_attestation"):
    - The authenticated user attests to their relationship
    - Optional: obituary link or document upload
    - 72-hour cooling period before avatar goes live
    """
    user = await verify_token(credentials)

    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if not consent.acknowledged_ai_disclaimer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must acknowledge that this is an AI approximation, not the real person.",
        )

    if not consent.acknowledged_data_usage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must acknowledge how your data will be used.",
        )

    # TODO: Implement consent recording in Supabase
    # 1. Insert into consent_logs (append-only table, no UPDATE/DELETE)
    # 2. Update avatar consent_status
    # 3. For deceased: start 72-hour cooling period
    # 4. Log IP + user agent for audit trail

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Consent recording will be implemented in Month 4",
    )


@router.get("/{avatar_id}", response_model=ConsentResponse)
async def get_consent_status(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get the current consent status for an avatar."""
    user = await verify_token(credentials)

    # TODO: Query consent_logs for this avatar
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Will be implemented with consent system",
    )


@router.post("/{avatar_id}/revoke", status_code=status.HTTP_200_OK)
async def revoke_consent(
    avatar_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Revoke consent for an avatar.
    
    This triggers:
    1. Avatar is immediately deactivated (no more conversations)
    2. A new consent_log entry is created (type: "revocation")
    3. Data deletion workflow is initiated:
       - Voice embeddings deleted within 24 hours
       - Photo references deleted within 24 hours
       - Memory vectors deleted within 24 hours
       - Consent audit log is RETAINED for compliance
    """
    user = await verify_token(credentials)

    # TODO: Implement consent revocation + cascading data deletion
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Consent revocation will be implemented in Month 4",
    )
