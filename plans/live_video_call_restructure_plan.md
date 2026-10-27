# Live Video Call Restructure, Photo-to-3D Avatar & Video Replay — Implementation Plan

> **Execution:** Following the user-approved design to restructure the live video call into a standalone `/call` route, permanently cache D-ID intro videos in Supabase, implement instant video replay, and introduce a real-time Photo-to-3D Depth Avatar.

**Goal:**
1. Extract Live Video Call from chat into dedicated `/call?avatarId=<id>` page.
2. Cache D-ID intro videos permanently in Supabase Storage (`avatar-photos/{userId}/{avatarId}/intro_talk.mp4`) to reduce D-ID credit burn by 85–95%.
3. Add instant Video Replay button on `/call` with zero credit consumption.
4. Render an interactive Photo-to-3D Depth Avatar using Three.js with real-time cursor parallax, depth displacement, idle breathing, and audio-reactive mouth movement.
5. Clean up `chat/page.js` of call modals, photo upload modals, and inline video logic.
6. Add "Video Call" nav item to `Navbar.js`.

---

## Architecture & Components

```
+-------------------------------------------------------------+
|  <- Back to Chat      Eternia Live Call        Duration: 02:45 |
+-------------------------------------------------------------+
|                                                             |
|           +-------------------------------------+           |
|           |                                     |           |
|           |       [ 3D Interactive Avatar ]     |           |
|           |       - True 3D depth & parallax    |           |
|           |       - Cursor gaze tracking        |           |
|           |       - Audio-reactive speaking     |           |
|           |       - Studio lighting reflection  |           |
|           |                                     |           |
|           |  [ 3D Avatar / Video Mode Toggle ]  |           |
|           |  [ Replay Intro Video Button ]      |           |
|           +-------------------------------------+           |
|                                                             |
|   Subtitle: "Hello! It is so wonderful to see you..."       |
|                                                             |
+-------------------------------------------------------------+
|  [ Mute ]   [ Click to Talk / Push to Speak ]   [ Replay ]  [ End Call ] |
+-------------------------------------------------------------+
```

---

## File Breakdown

### New Files
| File | Purpose |
|------|---------|
| `frontend/components/call/PhotoAvatar3D.js` | WebGL Three.js component mapping user photo onto a 3D depth mesh with cursor parallax, studio lighting, idle breathing, and audio-reactive mouth displacement |
| `frontend/app/call/page.js` | Dedicated Live Video Call page with 3D Avatar, Video Player with Replay, voice interaction, call duration, and mute controls |

### Modified Files
| File | Changes |
|------|---------|
| `backend/app/api/routes/did_avatar.py` | Add `GET /{avatar_id}/intro-video` & `POST /{avatar_id}/generate-intro` (permanent Supabase caching) |
| `frontend/lib/api.js` | Add `getIntroVideo` and `generateIntroVideo` methods |
| `frontend/components/chat/AvatarPhotoUpload.js` | Simplify to upload photo only (remove auto D-ID video trigger) |
| `frontend/app/chat/page.js` | Remove live call modal, photo upload modal, inline D-ID calls; add "Video Call" header button pointing to `/call` |
| `frontend/components/layout/Navbar.js` | Add "Video Call" nav link |

---

## Step-by-Step Execution Plan

- [x] **Task 1: Backend — Cached Intro Video Endpoints**
  - Add `GET /api/did-avatar/{avatar_id}/intro-video`
  - Add `POST /api/did-avatar/{avatar_id}/generate-intro` with idempotent Supabase storage caching
  - Verify routes in `did_avatar.py`

- [x] **Task 2: Frontend API — Add Intro Video Methods**
  - Add `getIntroVideo(avatarId)` in `frontend/lib/api.js`
  - Add `generateIntroVideo(avatarId)` in `frontend/lib/api.js`

- [x] **Task 3: Simplify AvatarPhotoUpload**
  - Remove auto D-ID generation from `AvatarPhotoUpload.js`
  - Update copy to "Upload Portrait Photo"

- [x] **Task 4: Build Photo-to-3D Depth Avatar Component**
  - Create `frontend/components/call/PhotoAvatar3D.js`
  - Implement 3D curved plane with texture map and depth displacement
  - Implement interactive mouse cursor tracking & 3D parallax tilt
  - Implement dynamic studio directional & rim lighting
  - Implement audio-reactive mouth movement when speaking

- [x] **Task 5: Build Dedicated `/call` Page with Replay & 3D Integration**
  - Create `frontend/app/call/page.js`
  - Integrate `PhotoAvatar3D` as primary 3D visual
  - Integrate `AvatarVideoPlayer` with video replay controls
  - Implement instant "Replay Video" button and overlay
  - Add mode toggle: "3D Avatar" vs "Video Call"
  - Implement voice interaction (Click to Talk / Web Speech API)

- [x] **Task 6: Clean Up `chat/page.js`**
  - Remove call modals, photo upload modals, inline video playback and D-ID generation
  - Add clean "Video Call" button in chat header

- [x] **Task 7: Update `Navbar.js`**
  - Add `Video` icon import and "Video Call" nav link to `/call`

- [x] **Task 8: End-to-End Verification**
  - Verify syntax and run tests/build
  - Test cached intro video flow, 3D avatar rendering, replay, and chat navigation
