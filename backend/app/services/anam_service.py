"""Anam.ai real-time interactive digital human avatar service."""

import logging
import urllib.request
from typing import Dict, Any, Optional
import requests
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class AnamService:
    """Service for managing Anam.ai interactive WebRTC digital human avatars and sessions."""

    def __init__(self):
        self.api_url = settings.ANAM_API_URL.rstrip("/")
        self.api_key = settings.ANAM_API_KEY
        self.default_voice_id = "91a47e5a-4fc0-11f1-84b0-52bacf74fa75"  # Corey - Supportive Buddy

    def get_headers(self) -> Dict[str, str]:
        if not self.api_key:
            raise ValueError("ANAM_API_KEY is not configured in backend settings.")
        return {
            "Authorization": f"Bearer {self.api_key}",
        }

    def create_avatar_from_photo(self, name: str, photo_url: str) -> str:
        """Upload a photo to Anam to generate a real-time digital human avatar."""
        headers = self.get_headers()
        try:
            with urllib.request.urlopen(photo_url, timeout=15) as resp:
                img_data = resp.read()

            files = {"imageFile": ("avatar.jpg", img_data, "image/jpeg")}
            data = {"displayName": name or "Companion"}

            url = f"{self.api_url}/avatars"
            res = requests.post(url, headers=headers, data=data, files=files, timeout=30)
            if res.status_code not in (200, 201):
                logger.error("Failed to create Anam avatar [%d]: %s", res.status_code, res.text)
                raise RuntimeError(f"Anam avatar creation failed: {res.text}")

            result = res.json()
            avatar_id = result.get("id")
            logger.info("Successfully created Anam avatar: %s for %s", avatar_id, name)
            return avatar_id
        except Exception as exc:
            logger.error("Error creating Anam avatar for %s: %s", name, exc)
            raise

    def create_persona(self, avatar_id: str, name: str, system_prompt: Optional[str] = None) -> str:
        """Create an Anam interactive persona linked to the digital avatar."""
        headers = self.get_headers()
        headers["Content-Type"] = "application/json"

        prompt = (
            system_prompt
            or f"You are {name}, a close and caring companion on Eternia. You interact warmly, naturally, and supportively."
        )

        payload = {
            "name": name,
            "description": f"AI Companion {name} on Eternia",
            "avatarId": avatar_id,
            "voiceId": self.default_voice_id,
            "llmId": "CUSTOMER_CLIENT_V1",
            "systemPrompt": prompt,
        }

        url = f"{self.api_url}/personas"
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        if res.status_code not in (200, 201):
            logger.error("Failed to create Anam persona [%d]: %s", res.status_code, res.text)
            raise RuntimeError(f"Anam persona creation failed: {res.text}")

        result = res.json()
        persona_id = result.get("id")
        logger.info("Successfully created Anam persona: %s for %s", persona_id, name)
        return persona_id

    def create_session_token(self, avatar_id: str) -> Dict[str, Any]:
        """Generate a short-lived WebRTC streaming session token for the avatar."""
        headers = self.get_headers()
        headers["Content-Type"] = "application/json"

        from backend.app.models.database import get_supabase_admin_client
        db = get_supabase_admin_client()

        av_res = db.table("avatars").select("*").eq("id", avatar_id).execute()
        if not av_res.data:
            raise ValueError(f"Avatar not found: {avatar_id}")

        avatar = av_res.data[0]
        name = avatar.get("name", "Companion")
        cfg = avatar.get("persona_config") or {}

        anam_persona_id = cfg.get("anam_persona_id")
        anam_avatar_id = cfg.get("anam_avatar_id")

        # Create avatar and persona if not already provisioned
        if not anam_avatar_id:
            photo_url = cfg.get("did_photo_url")
            if photo_url:
                anam_avatar_id = self.create_avatar_from_photo(name, photo_url)
                cfg["anam_avatar_id"] = anam_avatar_id
                db.table("avatars").update({"persona_config": cfg}).eq("id", avatar_id).execute()

        if not anam_persona_id and anam_avatar_id:
            anam_persona_id = self.create_persona(anam_avatar_id, name)
            cfg["anam_persona_id"] = anam_persona_id
            db.table("avatars").update({"persona_config": cfg}).eq("id", avatar_id).execute()

        if not anam_persona_id:
            raise RuntimeError(f"Could not resolve or create Anam persona for avatar {avatar_id}")

        # Request modern stateful session token from Anam
        token_url = f"{self.api_url}/auth/session-token"
        token_payload = {
            "personaConfig": {
                "personaId": anam_persona_id,
            }
        }

        res = requests.post(token_url, headers=headers, json=token_payload, timeout=15)
        if res.status_code not in (200, 201):
            logger.error("Failed to generate Anam session token [%d]: %s", res.status_code, res.text)
            raise RuntimeError(f"Anam session token generation failed: {res.text}")

        token_data = res.json()
        session_token = token_data.get("sessionToken")

        return {
            "sessionToken": session_token,
            "personaId": anam_persona_id,
            "avatarId": avatar_id,
            "anamAvatarId": anam_avatar_id,
            "name": name,
        }


anam_service = AnamService()
