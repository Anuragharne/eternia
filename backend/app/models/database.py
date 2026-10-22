"""Supabase database client initialization and helpers."""

from typing import Optional
from supabase import create_client, Client
from backend.app.core.config import settings

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get or create singleton Supabase client with anon key."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_ANON_KEY,
        )
    return _supabase_client


def get_supabase_admin_client() -> Client:
    """Get or create singleton Supabase client with service role key (admin bypass)."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        _supabase_admin_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_admin_client


def get_authenticated_client(access_token: str) -> Client:
    """Create a client scoped to a user's JWT access token for RLS enforcement."""
    client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )
    client.postgrest.auth(access_token)
    return client
