"""D-ID Talks API service for generating photorealistic talking avatar videos."""

import asyncio
import logging
from typing import Optional, Dict, Any
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory cache for recently generated video URLs (talk_id -> result_url)
# Keeps the last 50 results to avoid re-polling completed talks
_VIDEO_CACHE: Dict[str, str] = {}
MAX_VIDEO_CACHE = 50


class DIDService:
    """Service for generating talking avatar videos via D-ID Talks API."""

    def __init__(self):
        self.api_url = settings.DID_API_URL or "https://api.d-id.com"
        self.max_poll_attempts = 90  # Max polling attempts (90 * 2.5s = 225s / 3.75 min timeout)
        self.poll_interval = 2.5     # Seconds between poll requests

    def _get_headers(self) -> Dict[str, str]:
        """Build authorization headers for D-ID API."""
        key = settings.DID_API_KEY
        if not key:
            raise ValueError("DID_API_KEY is not configured in backend settings.")
        return {
            "Authorization": f"Basic {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def create_talk(
        self,
        source_url: str,
        text: str,
        voice_provider: str = "microsoft",
        voice_id: str = "en-US-JennyNeural",
        driver_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new talking avatar video via D-ID Talks API.

        Args:
            source_url: Public URL of the source face photo.
            text: The text the avatar should speak.
            voice_provider: TTS provider ("microsoft", "amazon", "elevenlabs").
            voice_id: Voice ID for the selected provider.
            driver_url: Optional driver video URL for specific expressions/movements.

        Returns:
            Dict with 'id' (talk ID) and 'status' keys.
        """
        endpoint = f"{self.api_url}/talks"
        headers = self._get_headers()

        payload = {
            "source_url": source_url,
            "script": {
                "type": "text",
                "input": text[:500],  # D-ID has text length limits
                "provider": {
                    "type": voice_provider,
                    "voice_id": voice_id,
                },
            },
            "config": {
                "stitch": True,  # Better quality stitching
            },
        }

        if driver_url:
            payload["driver_url"] = driver_url

        logger.info(
            "Creating D-ID talk: %d chars, voice=%s/%s",
            len(text), voice_provider, voice_id,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)

            if resp.status_code not in (200, 201):
                logger.error(
                    "D-ID create talk failed [%d]: %s",
                    resp.status_code, resp.text,
                )
                raise RuntimeError(
                    f"D-ID API error [{resp.status_code}]: {resp.text}"
                )

            result = resp.json()
            logger.info("D-ID talk created: id=%s, status=%s", result.get("id"), result.get("status"))
            return result

    async def get_talk_status(self, talk_id: str) -> Dict[str, Any]:
        """Poll D-ID for the status/result of a talk video.

        Args:
            talk_id: The talk ID returned from create_talk.

        Returns:
            Dict with 'status', and when done, 'result_url'.
        """
        endpoint = f"{self.api_url}/talks/{talk_id}"
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(endpoint, headers=headers)

            if resp.status_code != 200:
                logger.error(
                    "D-ID get talk status failed [%d]: %s",
                    resp.status_code, resp.text,
                )
                raise RuntimeError(
                    f"D-ID status check failed [{resp.status_code}]: {resp.text}"
                )

            return resp.json()

    async def generate_talk_video(
        self,
        source_url: str,
        text: str,
        voice_provider: str = "microsoft",
        voice_id: str = "en-US-JennyNeural",
    ) -> str:
        """Full pipeline: create talk → poll until done → return video URL.

        This is the primary method to call from the chat pipeline.

        Args:
            source_url: Public URL of the avatar's face photo.
            text: Text for the avatar to speak.
            voice_provider: TTS provider.
            voice_id: Voice ID.

        Returns:
            result_url: Direct URL to the MP4 video (valid ~24 hours).

        Raises:
            RuntimeError: If generation fails or times out.
            TimeoutError: If polling exceeds max attempts.
        """
        # 1. Create the talk
        talk_data = await self.create_talk(
            source_url=source_url,
            text=text,
            voice_provider=voice_provider,
            voice_id=voice_id,
        )
        talk_id = talk_data.get("id")
        if not talk_id:
            raise RuntimeError("D-ID returned no talk ID")

        # 2. Poll for completion
        for attempt in range(self.max_poll_attempts):
            await asyncio.sleep(self.poll_interval)

            status_data = await self.get_talk_status(talk_id)
            status = status_data.get("status", "unknown")

            logger.info(
                "D-ID talk %s poll #%d: status=%s",
                talk_id, attempt + 1, status,
            )

            if status == "done":
                result_url = status_data.get("result_url")
                if not result_url:
                    raise RuntimeError("D-ID talk done but no result_url returned")

                # Cache the result
                _VIDEO_CACHE[talk_id] = result_url
                if len(_VIDEO_CACHE) > MAX_VIDEO_CACHE:
                    # Remove oldest entry
                    oldest_key = next(iter(_VIDEO_CACHE))
                    del _VIDEO_CACHE[oldest_key]

                logger.info("D-ID talk %s completed: %s", talk_id, result_url)
                return result_url

            elif status in ("error", "rejected"):
                error_msg = status_data.get("error", {}).get("description", "Unknown error")
                raise RuntimeError(f"D-ID talk failed: {error_msg}")

        raise TimeoutError(
            f"D-ID talk {talk_id} did not complete within {self.max_poll_attempts * self.poll_interval}s"
        )

    async def get_remaining_credits(self) -> Dict[str, Any]:
        """Check remaining D-ID API credits/quota.

        Returns:
            Dict with credit information.
        """
        endpoint = f"{self.api_url}/credits"
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code != 200:
                logger.warning("Could not fetch D-ID credits: %s", resp.text)
                return {"remaining": "unknown", "total": "unknown"}
            return resp.json()


# Singleton instance
did_service = DIDService()
