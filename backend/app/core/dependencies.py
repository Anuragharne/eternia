"""FastAPI dependency injection utilities."""

from typing import Generator
from supabase import Client
from backend.app.models.database import get_supabase_client, get_supabase_admin_client


def get_db() -> Client:
    """Dependency that yields a Supabase client."""
    return get_supabase_client()


def get_admin_db() -> Client:
    """Dependency that yields a Supabase admin client with service role."""
    return get_supabase_admin_client()
