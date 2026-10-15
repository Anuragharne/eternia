"""
Authentication middleware — verifies Supabase JWT tokens.
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.core.config import settings


security = HTTPBearer()


async def verify_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """
    Verify a Supabase JWT token and return the decoded payload.
    
    Args:
        credentials: Bearer token from the Authorization header.
        
    Returns:
        Decoded JWT payload containing user info (sub, email, etc.)
        
    Raises:
        HTTPException: If token is invalid, expired, or missing.
    """
    token = credentials.credentials
    
    try:
        # Supabase uses the ANON_KEY as part of the JWT secret
        # In production, use the JWT secret from Supabase dashboard
        payload = jwt.decode(
            token,
            settings.SUPABASE_ANON_KEY,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )
