"""Voice synthesis service powered by ElevenLabs API with relationship-adaptive voice mapping."""

from collections import OrderedDict
import hashlib
import logging
from typing import Dict, Optional, Tuple
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Verified available voice catalog in user's ElevenLabs account
VOICE_CATALOG = {
    "jessica": {
        "id": "cgSgspJ2msm6clMCkdW9",
        "name": "Jessica",
        "gender": "female",
        "tone": "young, sweet, emotional, expressive",
    },
    "liam": {
        "id": "TX3LPaxmHKxFdv7VOQHJ",
        "name": "Liam",
        "gender": "male",
        "tone": "young, confident, warm, energetic",
    },
    "sarah": {
        "id": "EXAVITQu4vr4xnSDxMaL",
        "name": "Sarah",
        "gender": "female",
        "tone": "young, intimate, gentle, reassuring",
    },
    "will": {
        "id": "bIHbv24MWmeRgasZH58o",
        "name": "Will",
        "gender": "male",
        "tone": "young, chill, warm, conversational",
    },
    "matilda": {
        "id": "XrExE9yKIg1WjnnlVkGX",
        "name": "Matilda",
        "gender": "female",
        "tone": "elderly, maternal, patient, warm",
    },
    "bill": {
        "id": "pqHfZKP75CvOlQylNhV4",
        "name": "Bill",
        "gender": "male",
        "tone": "elderly, wise, comforting, deep",
    },
    "lily": {
        "id": "pFZP5JQG7iQjIQuC4Bku",
        "name": "Lily",
        "gender": "female",
        "tone": "middle-aged, maternal warmth, clear, affectionate",
    },
    "george": {
        "id": "JBFqnCBsd6RMkjVDRZzb",
        "name": "George",
        "gender": "male",
        "tone": "mature, comforting storyteller, authoritative warmth",
    },
    "river": {
        "id": "SAz9YHcvj6GT2YYXdXww",
        "name": "River",
        "gender": "neutral",
        "tone": "friendly, relaxed, conversational companion",
    },
}

# Relationship keyword to voice profile mapping
# Handles English, Hindi, and family colloquial terms
RELATIONSHIP_VOICE_RULES = [
    # Daughter / Sister / Younger Female
    (["daughter", "beti", "sister", "behen", "niece", "bhatiji", "bhanji"], "jessica"),
    # Son / Brother / Younger Male
    (["son", "beta", "brother", "bhai", "nephew", "bhatija", "bhanja"], "liam"),
    # Romantic Partner - Female
    (["girlfriend", "wife", "biwi", "partner", "fiancée", "fiancee", "crush", "lover"], "sarah"),
    # Romantic Partner - Male
    (["boyfriend", "husband", "pati", "fiancé", "fiance"], "will"),
    # Grandmother / Elderly Female
    (["grandmother", "grandma", "granny", "dadi", "nani", "ajji", "amma"], "matilda"),
    # Grandfather / Elderly Male
    (["grandfather", "grandpa", "granddad", "dadu", "dada", "nana", "thatha", "baba"], "bill"),
    # Mother / Maternal
    (["mother", "mom", "mummy", "maa", "ammi", "aai", "mataji", "mommy"], "lily"),
    # Father / Paternal
    (["father", "dad", "papa", "pitaji", "abba", "bapuji", "daddy"], "george"),
    # Friends & Mentors
    (["friend", "best friend", "buddy", "yaar", "dost", "colleague", "mentor"], "river"),
]

# Audio Cache (LRU up to 200 items to avoid repeated ElevenLabs character credit consumption)
MAX_CACHE_SIZE = 200
_AUDIO_CACHE: OrderedDict[str, bytes] = OrderedDict()


def resolve_voice_for_avatar(avatar_data: dict) -> Tuple[str, str]:
    """Resolve the best ElevenLabs voice ID and voice name for an avatar.

    Inspects avatar relationship, persona_config overrides, and bio context.
    Returns: (voice_id, voice_name)
    """
    # 1. Custom voice override if specified in avatar's persona_config
    persona_config = avatar_data.get("persona_config") or {}
    custom_voice_id = persona_config.get("elevenlabs_voice_id")
    if custom_voice_id:
        return custom_voice_id, persona_config.get("elevenlabs_voice_name", "Custom Voice")

    # 2. Check relationship
    raw_relationship = (avatar_data.get("relationship") or "").lower().strip()
    bio = (avatar_data.get("bio") or "").lower()

    for keywords, voice_key in RELATIONSHIP_VOICE_RULES:
        for kw in keywords:
            if kw in raw_relationship:
                profile = VOICE_CATALOG[voice_key]
                return profile["id"], profile["name"]

    # 3. Fallback heuristic using bio or default
    if any(pronoun in bio.split() for pronoun in ["she", "her", "hers", "woman", "girl"]):
        profile = VOICE_CATALOG["sarah"]
        return profile["id"], profile["name"]
    elif any(pronoun in bio.split() for pronoun in ["he", "him", "his", "man", "boy"]):
        profile = VOICE_CATALOG["george"]
        return profile["id"], profile["name"]

    # 4. Default companion voice (River: conversational, natural)
    default_profile = VOICE_CATALOG["river"]
    return default_profile["id"], default_profile["name"]


class VoiceService:
    """ElevenLabs Text-to-Speech integration service."""

    def __init__(self):
        self.api_url = "https://api.elevenlabs.io/v1/text-to-speech"

    def get_headers(self) -> Dict[str, str]:
        key = settings.ELEVENLABS_API_KEY
        if not key:
            raise ValueError("ELEVENLABS_API_KEY is not configured in backend settings.")
        return {
            "xi-api-key": key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        }

    async def synthesize(
        self,
        text: str,
        voice_id: str,
        model_id: Optional[str] = None,
        output_format: Optional[str] = None,
    ) -> bytes:
        """Synthesize text into speech audio bytes using ElevenLabs API.

        Uses in-memory LRU cache to preserve ElevenLabs character credits for identical inputs.
        Supports raw PCM 16kHz (pcm_16000) for real-time WebRTC lip-sync streaming.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text to synthesize cannot be empty.")

        model = model_id or settings.ELEVENLABS_MODEL or "eleven_multilingual_v2"
        fmt = output_format or "mp3_44100_128"

        # Cache key based on voice, model, format, and text hash
        cache_key = hashlib.sha256(f"{voice_id}:{model}:{fmt}:{clean_text}".encode("utf-8")).hexdigest()

        if cache_key in _AUDIO_CACHE:
            logger.info("Voice synthesis cache HIT for key %s", cache_key[:12])
            _AUDIO_CACHE.move_to_end(cache_key)
            return _AUDIO_CACHE[cache_key]

        endpoint = f"{self.api_url}/{voice_id}"
        if fmt == "pcm_16000":
            endpoint = f"{endpoint}?output_format=pcm_16000"
            headers = {
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
                "Accept": "*/*",
            }
        else:
            headers = self.get_headers()

        payload = {
            "text": clean_text,
            "model_id": model,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

        logger.info(
            "Synthesizing %d characters via ElevenLabs (format: %s, voice: %s, model: %s)...",
            len(clean_text),
            fmt,
            voice_id,
            model,
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)

            if resp.status_code != 200:
                logger.error(
                    "ElevenLabs API failed with status %d: %s",
                    resp.status_code,
                    resp.text,
                )
                raise RuntimeError(
                    f"ElevenLabs TTS failed [{resp.status_code}]: {resp.text}"
                )

            audio_data = resp.content

            # Update LRU cache
            _AUDIO_CACHE[cache_key] = audio_data
            if len(_AUDIO_CACHE) > MAX_CACHE_SIZE:
                _AUDIO_CACHE.popitem(last=False)

            logger.info("Successfully synthesized %d bytes of audio.", len(audio_data))
            return audio_data

    async def create_instant_voice_clone(
        self,
        name: str,
        audio_bytes: bytes,
        filename: str = "voice_sample.mp3",
    ) -> str:
        """Create an instant voice clone in ElevenLabs from an audio sample.

        Returns:
            voice_id: The ElevenLabs custom voice ID string.
        """
        if not audio_bytes:
            raise ValueError("Audio sample cannot be empty.")

        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}
        data = {
            "name": f"{name} (Eternia Clone)",
            "description": f"Personal instant voice clone for AI Companion {name}",
        }

        content_type = "audio/mpeg"
        lower_fn = filename.lower()
        if lower_fn.endswith(".wav"):
            content_type = "audio/wav"
        elif lower_fn.endswith(".ogg"):
            content_type = "audio/ogg"
        elif lower_fn.endswith(".webm"):
            content_type = "audio/webm"
        elif lower_fn.endswith(".m4a"):
            content_type = "audio/mp4"

        files = [
            ("files", (filename, audio_bytes, content_type))
        ]

        logger.info("Submitting voice sample to ElevenLabs Instant Voice Clone API for %s...", name)
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, data=data, files=files)
            if resp.status_code not in (200, 201):
                logger.error("ElevenLabs voice cloning failed [%d]: %s", resp.status_code, resp.text)
                raise RuntimeError(f"ElevenLabs voice cloning failed: {resp.text}")

            result = resp.json()
            voice_id = result.get("voice_id")
            if not voice_id:
                raise RuntimeError(f"No voice_id in ElevenLabs response: {result}")

            logger.info("Successfully created ElevenLabs voice clone: %s for %s", voice_id, name)
            return voice_id

    async def delete_voice(self, voice_id: str) -> bool:
        """Delete a custom cloned voice from ElevenLabs to free up voice slots."""
        url = f"https://api.elevenlabs.io/v1/voices/{voice_id}"
        headers = {"xi-api-key": settings.ELEVENLABS_API_KEY}
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.delete(url, headers=headers)
            return resp.status_code in (200, 204)


voice_service = VoiceService()
