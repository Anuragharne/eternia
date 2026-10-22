"""Data export and privacy compliance API routes."""

import json
import io
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from backend.app.core.auth import get_current_user
from backend.app.core.dependencies import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/export", tags=["Data Export & Privacy"])


@router.get("/user-data", summary="Export full user memory and chat archive (ZIP/JSON)")
async def export_user_data(
    format: str = Query("zip", description="Format: 'zip' or 'json'"),
    user_id: str = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Generates an export archive containing user profile, avatars, memories, and chat history."""
    # 1. Fetch user profile
    user_res = (
        supabase.table("users")
        .select("*")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    user_profile = user_res.data or {"id": user_id}

    # 2. Fetch avatars
    avatars_res = (
        supabase.table("avatars")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    avatars = avatars_res.data or []
    avatar_ids = [a["id"] for a in avatars]

    # 3. Fetch memories
    memories = []
    if avatar_ids:
        mem_res = (
            supabase.table("memories")
            .select("*")
            .in_("avatar_id", avatar_ids)
            .execute()
        )
        memories = mem_res.data or []

    # 4. Fetch chat messages
    messages = []
    if avatar_ids:
        msg_res = (
            supabase.table("chat_messages")
            .select("*")
            .in_("avatar_id", avatar_ids)
            .order("created_at")
            .execute()
        )
        messages = msg_res.data or []

    # 5. Fetch consent logs
    consent_res = (
        supabase.table("consent_logs")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    consent_logs = consent_res.data or []

    export_payload = {
        "export_metadata": {
            "platform": "Eternia AI Companion",
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "total_avatars": len(avatars),
            "total_memories": len(memories),
            "total_chat_messages": len(messages),
        },
        "profile": user_profile,
        "avatars": avatars,
        "memories": memories,
        "chat_messages": messages,
        "consent_audit_trail": consent_logs,
    }

    if format.lower() == "json":
        json_str = json.dumps(export_payload, indent=2, default=str)
        return Response(
            content=json_str,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=eternia_export_{user_id[:8]}.json"
            },
        )

    # Build ZIP archive in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Full JSON master export
        zf.writestr(
            "eternia_master_archive.json",
            json.dumps(export_payload, indent=2, default=str),
        )

        # Human-readable TXT memories summary
        txt_memories = [
            f"=== ETERNIA MEMORIES ARCHIVE ===",
            f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"Total Memories: {len(memories)}",
            "",
        ]
        for idx, m in enumerate(memories, 1):
            source = m.get("source", "unknown")
            created = m.get("created_at", "")
            content = m.get("content", "")
            entities = m.get("entities", [])
            txt_memories.append(f"[{idx}] Source: {source} | Date: {created}")
            if entities:
                txt_memories.append(f"    Entities: {', '.join(entities)}")
            txt_memories.append(f"    Content: {content}\n")

        zf.writestr("memories_readable.txt", "\n".join(txt_memories))

        # Human-readable Chat transcript
        txt_chat = [
            f"=== ETERNIA CONVERSATION TRANSCRIPT ===",
            f"Exported: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"Total Messages: {len(messages)}",
            "",
        ]
        for msg in messages:
            role = msg.get("role", "unknown").upper()
            created = msg.get("created_at", "")
            content = msg.get("content", "")
            grounded = " [GROUNDED IN MEMORY]" if msg.get("is_grounded") else ""
            txt_chat.append(f"[{created}] {role}{grounded}:\n{content}\n")

        zf.writestr("chat_transcript.txt", "\n".join(txt_chat))

    zip_bytes = zip_buffer.getvalue()
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=eternia_backup_{user_id[:8]}.zip"
        },
    )
