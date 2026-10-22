"""Authentication dependencies for verifying Supabase JWT tokens."""

import logging
from typing import Dict, Optional
import jwt
from fastapi import Depends, Header
from backend.app.core.config import settings
from backend.app.core.errors import UnauthorizedError

logger = logging.getLogger(__name__)


DEFAULT_DEMO_USER = {
    "id": "e0f94573-eae2-4667-897f-40ad124053f7",
    "email": "programmed911@gmail.com",
    "role": "authenticated",
    "token": "demo-token",
}


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, str]:
    """FastAPI dependency to extract and verify the Supabase authenticated user.

    In direct college demo mode, falls back to the default demo user if unauthenticated.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return DEFAULT_DEMO_USER

    token = authorization.split(" ")[1].strip()
    if not token or token == "demo-token":
        return DEFAULT_DEMO_USER

    try:
        # If JWT secret is configured, verify HMAC signature; otherwise decode with claim validation
        if settings.SUPABASE_JWT_SECRET:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": True},
            )

        user_id = payload.get("sub")
        if not user_id:
            return DEFAULT_DEMO_USER

        return {
            "id": user_id,
            "email": payload.get("email", ""),
            "role": payload.get("role", "authenticated"),
            "token": token,
        }
    except Exception as e:
        logger.info(f"Using default college demo user (no active Supabase session: {e})")
        return DEFAULT_DEMO_USER
