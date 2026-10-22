# Eternia — Empathetic AI Memory & Companion Sanctuary

[![Next.js](https://img.shields.io/badge/Next.js-16.3-0D0D0D?style=flat&logo=next.js&logoColor=FAFAFA)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-433075?style=flat&logo=fastapi&logoColor=FAFAFA)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-A58CF4?style=flat&logo=tailwindcss&logoColor=0D0D0D)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-433075?style=flat&logo=python&logoColor=FAFAFA)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-A58CF4?style=flat)](LICENSE)

> **Where Memories Live Forever**  
> An empathetic conversational AI companion platform designed to preserve authentic voice, stories, and lived memories of loved ones. Grounded in private vector memory with ethical consent and anti-hallucination guardrails.

---

## 🎨 Strict 4-Color Brand Design System

Eternia is styled with a unified, dark luxury color system adhering to a strict 4-color palette across every page and component:

| Color Name | HEX | RGB Triplet | Role & Application |
| :--- | :--- | :--- | :--- |
| **Deep Purple** | `#433075` | `rgb(67, 48, 117)` | **Primary brand color**: Hero radial glows, headers, primary buttons (`.btn-pill-primary`), active tab highlights, user chat bubbles, and modal actions. |
| **Lavender** | `#A58CF4` | `rgb(165, 140, 244)` | **Accent color**: Highlights, links, hover states, icons, secondary button fills (`.btn-pill-secondary`), active borders, and focus rings. |
| **Soft White** | `#FAFAFA` | `rgb(250, 250, 250)` | **Typography & Light Accents**: Primary headings (`h1`–`h4`), body copy on dark surfaces, and high-contrast button labels. |
| **Jet Black** | `#0D0D0D` | `rgb(13, 13, 13)` | **Canvas & Surfaces**: Global dark mode viewport background (`body`), card surfaces, form inputs (`.input`, `textarea`), and dropdowns. |

---

## ✨ Key Features

1. **Direct 3D Neural Presence Showcase (`/`)**
   - Holographic silhouette featuring a living, translucent rainbow cognitive core.
   - Interactive 3D mouse perspective tracking (`perspective: 1200px`, `rotateX/rotateY`) with ambient Deep Purple & Lavender radiant auras.
   - Zero card clutter or distracting badges — floating directly on the dark homepage canvas.

2. **Grounded Sanctuary Chat (`/chat`)**
   - Real-time conversation with active companions.
   - Grounded RAG (Retrieval-Augmented Generation) cross-referencing private vector memories.
   - Multi-tier anti-hallucination indicators (`✓ Grounded in Memory` vs `✦ Gentle Reflection`).
   - One-click memory preservation modal for capturing stories, favorite sayings, and documents.

3. **New Companion Onboarding Wizard (`/onboarding`)**
   - 3-step streamlined creation flow (Identity & Persona, Voice & Cadence, Anchor Memories).
   - Append-only ethical consent verification (living consent vs. family attestation).
   - Multi-format ingestion (text, chat exports, transcripts, `.txt`, `.docx`).

4. **Sovereign Privacy & Settings (`/settings`)**
   - Unified floating capsule navigation with brand title.
   - Comprehensive model analytics, storage counts, and memory fidelity meters.
   - Complete ZIP archive export with zero universal model training guarantees.
   - Modal-guarded irreversible memory wipe confirmation.

---

## 📁 Repository Structure

```
AI companion/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI REST endpoints (avatars, chat, memories, consent, export)
│   │   ├── core/                # Config, security, database dependencies, custom exceptions
│   │   ├── models/              # Pydantic schemas & database entities
│   │   ├── services/            # Chat RAG, embeddings, vector indexing, memory parser
│   │   └── main.py              # Application entrypoint & CORS middleware
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Backend environment template
├── frontend/
│   ├── app/
│   │   ├── chat/page.js         # Sanctuary conversational interface
│   │   ├── onboarding/page.js   # New companion wizard
│   │   ├── settings/page.js     # Settings, privacy & data management
│   │   ├── globals.css          # Design tokens, variables & utility classes
│   │   ├── layout.js            # Root layout with Plus Jakarta Sans typography
│   │   └── page.js              # Landing page with 3D neural avatar showcase
│   ├── components/
│   │   ├── landing/             # HeroAvatar (direct 3D), AvatarCanvas, 3D WebGL modules
│   │   ├── layout/Navbar.js     # Floating capsule glassmorphic navbar
│   │   └── ui/                  # Button, Input, Card, Badge reusable components
│   ├── public/images/           # Visual assets & transparent neural cutouts
│   └── package.json             # Next.js 16 + dependencies
├── run_dev.bat                  # Windows one-click local startup script
├── run_dev.ps1                  # PowerShell one-click startup script
├── .gitignore                   # Security, dependencies & build ignores
└── README.md                    # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ & `npm`
- **Python** 3.10+ & `pip`
- (Optional) Supabase project / local PostgreSQL with `pgvector`

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment (optional but recommended)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your LLM keys (OpenAI / Anthropic / Gemini) and Supabase credentials

# Start FastAPI backend server
python -m uvicorn backend.app.main:app --port 8000 --reload
```
The backend API docs will be available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
The website will be live at `http://localhost:3000`.

### 3. Quick Start (Windows)
Run the root startup script to launch both services concurrently:
```cmd
.\run_dev.bat
```
or via PowerShell:
```powershell
.\run_dev.ps1
```

---

## 🔒 Security & Privacy Commitments
- **Zero Public Training**: User memory archives are never used to train public foundational models.
- **Append-Only Consent Logs**: Every companion created logs an immutable digital consent ledger.
- **Full Data Sovereignty**: Users retain 100% ownership and can download or delete their archives anytime.

---

## 📝 Recent Updates & Changelog
- **Uncapped Testing Phase (Unlimited Chat, Voice & Video)**:
  - Lifted all tier quotas, memory limits, and slot restrictions across backend and frontend.
  - Added live **Speech-to-Text Microphone Input** (`<Mic />`) directly in the Sanctuary chat input pill.
  - Added **Text-to-Speech Audio Playback** (`<Volume2 />`) allowing companions to speak their responses aloud in natural cadence.
  - Added **Live Voice & Video Presence Call Modal** (`<Phone />` / `<Video />`) featuring an animated audio visualizer and continuous conversation.
  - Set default companion consent and voice status to active immediately upon creation.
- **Direct 3D Hero Avatar**: Replaced the 3D boy avatar with an iridescent neural visual; eliminated outer box/card borders, badge clutter, and speech bubble for a pure, floating 3D presence.
- **Strict 4-Color Brand Palette Enforced**: Mapped the entire website to `#433075` (Deep Purple), `#A58CF4` (Lavender), `#FAFAFA` (Soft White), and `#0D0D0D` (Jet Black). 0 off-palette colors across all files.
- **Robust Memory Import & Document Parser**:
  - Fixed WhatsApp chat export regex parsing by compiling with `re.MULTILINE` and supporting iOS/Android bracket & 12h/24h timestamp formats.
  - Added automatic safe chunking (`MAX_MEMORY_CONTENT_LENGTH = 8000`) across all plain text, PDF, and DOCX parsers to strictly conform to Supabase Postgres `CHECK (char_length(content) BETWEEN 1 AND 10000)`.
  - Added fast heuristic metadata extraction for bulk memory imports (> 3 items) to prevent external LLM rate limit bottlenecks and eliminate 429 quota exhaustion.
  - Added global ASGI exception handler in FastAPI to ensure all errors return standardized JSON responses with full CORS headers.
- **High-Speed Conversational Memory Ingestion & Batching**:
  - Replaced slow sequential 1-by-1 message processing with conversational session chunking (`group_chat_into_sessions`), grouping continuous dialogue into coherent narrative chunks with participant headers and timestamps.
  - Enabled batch vector embeddings via `gemini-embedding-2` processing up to 50 texts per remote API request.
  - Implemented bulk upserts in Qdrant (`upsert_batch`) and bulk insertions in Supabase Postgres, reducing upload time for large 400KB+ chat exports from over an hour down to under 10 seconds.
- **Fixed Sanctuary Chat Window**: Removed rogue unpositioned blur elements causing blank vertical gaps above the chat interface.
- **Rebuilt Onboarding & Settings Pages**: Replaced broken white containers with sleek Jet Black cards, verified button callbacks, and unified floating capsule navigation.
