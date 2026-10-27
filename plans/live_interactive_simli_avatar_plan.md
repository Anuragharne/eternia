# Live Interactive Simli Avatar & 16:9 Single-Frame Call Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time, low-latency photorealistic avatar streaming using the user's Simli API key (`e99h4ffkabifgxouo7j0kq`) and overhaul the video call page (`frontend/app/call/page.js`) into a zero-scroll single-frame 16:9 widescreen layout with controls seamlessly anchored below the avatar.

**Architecture:** 
1. **Backend Simli Service (`backend/app/services/simli_service.py`)**: Securely requests WebRTC session tokens from Simli's Compose API (`POST https://api.simli.ai/compose/token`) configured for 16:9 widescreen output (`streaming_width: 1024, streaming_height: 576`), passing custom or default face IDs.
2. **Frontend WebRTC Engine (`frontend/app/call/page.js`)**: Integrates `simli-client` on the client side. Renders the live incoming media tracks into a 16:9 `<video>` element, hooks companion TTS audio via `simliClient.listenToAudioElement()` for sub-second lipsync, and displays natural idle human behaviors (blinking, breathing) when silent.
3. **Single-Frame 16:9 UI Layout**: Replaces the tall overflowing container with a strict `h-screen max-h-screen overflow-hidden flex flex-col` viewport layout. The 16:9 cinematic avatar container and the call control dock (mic, mute, text input, end call) fit cleanly inside the screen without any page scrollbars across all desktop and laptop resolutions.

**Tech Stack:** 
- Simli WebRTC SDK (`simli-client@3.2.0`, `livekit-client`)
- Next.js 14 (React 18), Tailwind CSS, Vanilla CSS Glassmorphism
- FastAPI (Python 3.14), Pydantic Settings, HTTPX/Urllib
- Web Speech API (STT), ElevenLabs / Web Audio (TTS)

**Spec:** User request: 16:9 widescreen avatar container, single-frame viewport without scrollbars, Simli real-time interactive avatar integration with API key `e99h4ffkabifgxouo7j0kq`.

## Global Constraints
- **Color Palette:** `#0D0D0D` (bg), `#433075` (dark purple), `#A58CF4` (lavender accent), `#FAFAFA` (text).
- **Aspect Ratio:** Avatar video frame must be 16:9 widescreen (`aspect-video`).
- **Zero Page Scroll:** The entire call screen must fit inside `h-screen` without vertical or horizontal scrollbars.
- **API Security:** Simli API key `e99h4ffkabifgxouo7j0kq` managed via backend environment variables; session tokens generated server-side.
- **Fail-Safe Fallback:** If WebRTC connection drops or offline, cleanly fall back to high-resolution companion portrait photo without crashing.

---

### Task 1: Environment & Backend Configuration

**Files:**
- Modify: `backend/.env`
- Modify: `backend/app/core/config.py`

**Interfaces:**
- Produces: `settings.SIMLI_API_KEY`, `settings.SIMLI_API_URL`, `settings.SIMLI_DEFAULT_FACE_ID`

- [ ] **Step 1: Add Simli configuration variables to `backend/.env`**
Add:
```env
# Simli Live Interactive Avatar API
SIMLI_API_KEY="e99h4ffkabifgxouo7j0kq"
SIMLI_API_URL="https://api.simli.ai"
SIMLI_DEFAULT_FACE_ID="03ce3ee8-db97-4150-a333-8f643d48fee9"
```

- [ ] **Step 2: Update `backend/app/core/config.py` with Simli settings fields**
In `Settings` class:
```python
    # Simli Live Avatar API
    SIMLI_API_KEY: str = ""
    SIMLI_API_URL: str = "https://api.simli.ai"
    SIMLI_DEFAULT_FACE_ID: str = "03ce3ee8-db97-4150-a333-8f643d48fee9"
```

- [ ] **Step 3: Verify backend settings load correctly**
Run: `python -c "from backend.app.core.config import settings; assert settings.SIMLI_API_KEY == 'e99h4ffkabifgxouo7j0kq'; print('Simli Settings OK')"`
Expected: `Simli Settings OK`

- [ ] **Step 4: Commit environment and config updates**
```bash
git add backend/.env backend/app/core/config.py
git commit -m "config: add simli api configuration to backend"
```

---

### Task 2: Backend Simli Service & API Routes

**Files:**
- Create: `backend/app/services/simli_service.py`
- Create: `backend/app/api/routes/simli.py`
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces:
  - `POST /api/simli/token`: Generates a Simli 16:9 WebRTC session token for an avatar
  - `GET /api/simli/faces`: Lists available Simli faces / default face presets
- Consumes: `settings.SIMLI_API_KEY`, `settings.SIMLI_API_URL`

- [ ] **Step 1: Create `backend/app/services/simli_service.py`**
Implement:
```python
"""Simli real-time interactive avatar integration service."""

import logging
import urllib.request
import json
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class SimliService:
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
            "streaming_height": 576,  # 16:9 aspect ratio
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
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "session_token": data.get("session_token"),
                    "face_id": target_face,
                    "aspect_ratio": "16:9",
                    "width": 1024,
                    "height": 576,
                }
        except Exception as exc:
            logger.error("Failed to generate Simli session token: %s", exc)
            raise RuntimeError(f"Simli session token generation failed: {exc}")

    def list_available_faces(self) -> list:
        """List available Simli faces and presets."""
        url = f"{self.api_url}/faces/legacy"
        req = urllib.request.Request(
            url,
            headers={"x-simli-api-key": self.api_key},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            logger.warn("Failed to list Simli faces: %s", exc)
            return []

simli_service = SimliService()
```

- [ ] **Step 2: Create `backend/app/api/routes/simli.py`**
Implement the router:
```python
"""API routes for Simli Live Interactive Avatar."""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.app.services.simli_service import simli_service

router = APIRouter(prefix="/simli", tags=["Simli"])

class SimliTokenRequest(BaseModel):
    avatar_id: Optional[str] = None
    face_id: Optional[str] = None

@router.post("/token")
def get_simli_token(payload: SimliTokenRequest = SimliTokenRequest()):
    """Generate a 16:9 WebRTC streaming session token."""
    try:
        token_data = simli_service.create_session_token(face_id=payload.face_id)
        return token_data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/faces")
def get_simli_faces():
    """Retrieve available Simli faces."""
    return simli_service.list_available_faces()
```

- [ ] **Step 3: Register route in `backend/app/main.py` and test with curl/python**
Add `app.include_router(simli.router, prefix="/api")`.
Run: `python -c "import urllib.request, json; data = json.dumps({}).encode(); req = urllib.request.Request('http://127.0.0.1:8000/api/simli/token', data=data, headers={'Content-Type': 'application/json'}); res = urllib.request.urlopen(req); print(res.status, 'Session token received!')"`
Expected: `200 Session token received!`

- [ ] **Step 4: Commit Simli backend service and routes**
```bash
git add backend/app/services/simli_service.py backend/app/api/routes/simli.py backend/app/main.py
git commit -m "feat: add simli session token generation service and api routes"
```

---

### Task 3: Frontend API Client Extension

**Files:**
- Modify: `frontend/lib/api.js`

**Interfaces:**
- Produces: `api.getSimliToken(avatarId, faceId)`, `api.getSimliFaces()`

- [ ] **Step 1: Add Simli API methods to `frontend/lib/api.js`**
```javascript
  // Simli Live Avatar WebRTC Token
  async getSimliToken(avatarId = null, faceId = null) {
    return this.request("/simli/token", {
      method: "POST",
      body: JSON.stringify({ avatar_id: avatarId, face_id: faceId }),
    });
  },

  async getSimliFaces() {
    return this.request("/simli/faces");
  },
```

- [ ] **Step 2: Test API call from Node test script**
Run: `node -e "fetch('http://127.0.0.1:8000/api/simli/token', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}).then(r => r.json()).then(d => console.log('Token test success:', !!d.session_token))"`
Expected: `Token test success: true`

---

### Task 4: Complete Overhaul of Video Call Page (`frontend/app/call/page.js`)

**Files:**
- Modify: `frontend/app/call/page.js`

**Key Requirements:**
1. **Single Frame Viewport (Zero Scroll):** 
   - Root wrapper: `h-screen max-h-screen overflow-hidden flex flex-col bg-[#0D0D0D]`
   - Header: `h-14` (56px) compact bar
   - Center Viewport: `flex-1 flex flex-col items-center justify-center p-2 sm:p-4 min-h-0 overflow-hidden`
   - Avatar Frame: `w-full max-w-4xl aspect-video max-h-[calc(100vh-210px)] rounded-2xl sm:rounded-3xl`
   - Controls Row: Anchored cleanly below the video container in the same viewport frame.
2. **16:9 Widescreen Presentation:**
   - Container has CSS `aspect-ratio: 16 / 9` with glassmorphic borders and soft purple ambient backlight.
   - Live `<video>` element with `object-fit: cover` rendering Simli's real-time WebRTC 16:9 feed.
   - Audio element `<audio ref={companionAudioRef} />` hooked to `simliClient.listenToAudioElement()` for zero-delay speech lip syncing.
3. **Continuous Live Presence & Interactivity:**
   - WebRTC connection starts upon page load.
   - Idle breathing and blinking rendered automatically by Simli when the companion is listening.
   - Sub-second speech response: When user speaks or types, the AI answers and Simli synchronizes facial expressions instantly.
4. **Captions & Controls Dock:**
   - Live subtitle text bar overlaid along the bottom border of the 16:9 screen (or right below it).
   - Clean, ergonomic control bar:
     - Volume / Mute toggle
     - Floating pulsing Microphone button with active speech wave animation
     - Text chat input bar ("Say something to [Name]...")
     - End Call button (PhoneOff) returning cleanly to chat.

- [ ] **Step 1: Implement the modernized `frontend/app/call/page.js`**
Rewrite `frontend/app/call/page.js` with dynamic `simli-client` import (to ensure 100% SSR compatibility in Next.js), WebRTC initialization, 16:9 ratio enforcement, and single-frame layout.

- [ ] **Step 2: Validate client build**
Run: `npm run build` in `frontend/`
Expected: Zero compilation errors, `/call` route builds successfully.

- [ ] **Step 3: Commit frontend video call overhaul**
```bash
git add frontend/app/call/page.js frontend/lib/api.js
git commit -m "feat: overhaul video call with simli 16:9 single-frame live interactive avatar"
```

---

### Task 5: End-to-End Verification & Visual Testing

**Files:**
- Verify: `http://localhost:3000/call`
- Verify: `http://localhost:8000/api/simli/token`

- [ ] **Step 1: Check HTTP routes and API health**
Verify status `200 OK` on backend `/api/simli/token` and frontend `/call`.
- [ ] **Step 2: Verify viewport single-frame fit (no vertical scrollbar)**
Inspect the DOM in browser and ensure `scrollHeight === clientHeight` (zero scrolling).
- [ ] **Step 3: Verify 16:9 aspect ratio and Simli WebRTC connection**
Ensure avatar container maintains 16:9 aspect ratio and video element binds to stream.
