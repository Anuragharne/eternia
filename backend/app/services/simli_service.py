"""Simli real-time interactive avatar integration service."""

import logging
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, Optional, List
import requests
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class SimliService:
    """Service to communicate with Simli WebRTC Live Avatar API."""

    def __init__(self):
        self.api_key = settings.SIMLI_API_KEY
        self.api_url = settings.SIMLI_API_URL.rstrip("/")
        self.default_face_id = settings.SIMLI_DEFAULT_FACE_ID

    def check_face_status(self, face_id: str) -> str:
        """Check status of custom face generation on Simli."""
        url = f"{self.api_url}/faces/legacy/generation_status?face_id={face_id}"
        req = urllib.request.Request(
            url,
            headers={"x-simli-api-key": self.api_key},
        )
        try:
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("status", "unknown")
        except Exception as exc:
            logger.warning("Failed to check face status for %s: %s", face_id, exc)
            return "unknown"

    def trigger_face_generation(self, avatar_id: str, photo_url: str, name: str) -> Optional[str]:
        """Trigger face generation from photo on Simli."""
        try:
            # Download image bytes
            with urllib.request.urlopen(photo_url, timeout=10) as resp:
                img_bytes = resp.read()

            enc_name = urllib.parse.quote(name or "Companion")
            url = f"{self.api_url}/faces/legacy?characterVersion=1.5&face_name={enc_name}"
            files = {"image": ("photo.jpg", img_bytes, "image/jpeg")}
            res = requests.post(url, headers={"x-simli-api-key": self.api_key}, files=files, timeout=25)
            if res.status_code == 200:
                data = res.json()
                char_uid = data.get("character_uid")
                if char_uid:
                    from backend.app.models.database import get_supabase_admin_client
                    db = get_supabase_admin_client()
                    av_res = db.table("avatars").select("persona_config").eq("id", avatar_id).execute()
                    if av_res.data:
                        cfg = av_res.data[0].get("persona_config") or {}
                        cfg["simli_face_id"] = char_uid
                        cfg["simli_status"] = "processing"
                        db.table("avatars").update({"persona_config": cfg}).eq("id", avatar_id).execute()
                    return char_uid
        except Exception as exc:
            logger.warning("Failed to trigger Simli face generation: %s", exc)
        return None

    def create_session_token(self, face_id: Optional[str] = None, avatar_id: Optional[str] = None) -> Dict[str, Any]:
        """Request a WebRTC session token from Simli for 16:9 widescreen streaming."""
        custom_face_status = "none"
        target_face = face_id

        if avatar_id:
            try:
                from backend.app.models.database import get_supabase_admin_client
                db = get_supabase_admin_client()
                avatar_res = db.table("avatars").select("*").eq("id", avatar_id).execute()
                if avatar_res.data:
                    avatar = avatar_res.data[0]
                    cfg = avatar.get("persona_config") or {}
                    simli_face = cfg.get("simli_face_id")

                    if simli_face:
                        status = self.check_face_status(simli_face)
                        custom_face_status = status
                        if status in ["completed", "ready"]:
                            target_face = simli_face
                    else:
                        photo_url = cfg.get("did_photo_url")
                        if photo_url:
                            self.trigger_face_generation(avatar_id, photo_url, avatar.get("name", "Companion"))
                            custom_face_status = "processing"
            except Exception as e:
                logger.warning("Error resolving avatar face in database: %s", e)

        target_face = target_face or self.default_face_id
        url = f"{self.api_url}/compose/token"
        payload = {
            "faceId": target_face,
            "handleSilence": True,
            "maxSessionLength": 3600,
            "maxIdleTime": 60,
            "model": "fasttalk",
            "aspectRatio": "16:9",
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "x-simli-api-key": self.api_key,
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "session_token": data.get("session_token"),
                    "face_id": target_face,
                    "aspect_ratio": "16:9",
                    "width": 1024,
                    "height": 576,
                    "custom_face_status": custom_face_status,
                    "warnings": data.get("warnings", []),
                }
        except Exception as exc:
            logger.error("Failed to generate Simli session token: %s", exc)
            raise RuntimeError(f"Simli session token generation failed: {exc}")

    def list_available_faces(self) -> List[Dict[str, Any]]:
        """List available default and custom Simli faces."""
        url = f"{self.api_url}/faces/legacy"
        req = urllib.request.Request(
            url,
            headers={"x-simli-api-key": self.api_key},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.warning("Failed to list Simli faces: %s", exc)
            return []


simli_service = SimliService()
