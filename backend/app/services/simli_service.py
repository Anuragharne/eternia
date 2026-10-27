"""Simli real-time interactive avatar integration service."""

import logging
import urllib.request
import json
from typing import Dict, Any, Optional, List
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class SimliService:
    """Service to communicate with Simli WebRTC Live Avatar API."""

    def __init__(self):
        self.api_key = settings.SIMLI_API_KEY
        self.api_url = settings.SIMLI_API_URL.rstrip("/")
        self.default_face_id = settings.SIMLI_DEFAULT_FACE_ID

    def create_session_token(self, face_id: Optional[str] = None) -> Dict[str, Any]:
        """Request a WebRTC session token from Simli for 16:9 widescreen streaming."""
        target_face = face_id or self.default_face_id
        url = f"{self.api_url}/compose/token"
        payload = {
            "faceId": target_face,
            "apiVersion": "v2",
            "streaming_width": 1024,
            "streaming_height": 576,  # 16:9 widescreen format
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
