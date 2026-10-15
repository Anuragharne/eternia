# Eternia — AI Companion Platform

> Preserve and interact with the likeness, voice, and memories of a loved one through a conversational AI avatar.

## Project Structure

```
├── frontend/          # Next.js 15 web application
├── backend/           # FastAPI Python backend
├── plans/             # Architecture, schema, and design specifications
└── README.md
```

## Tech Stack

| Layer | Technology |
|:---|:---|
| Frontend | Next.js 15, React 19, Vanilla CSS |
| Backend | FastAPI (Python) |
| Auth | Supabase Auth |
| Database | Supabase Postgres |
| Vector DB | Qdrant Cloud |
| LLM | Google Gemini 2.5 Flash |
| Voice (V1.1) | ElevenLabs API |
| Avatar (V1.2) | HeyGen API |
| Storage | AWS S3 (AES-256 encrypted) |
| Cache | Redis (Upstash) |

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Git

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Development Status

**Current Phase:** Phase 1 — MVP ("A Chatbot That Remembers")

See [implementation_plan.md](plans/implementation_plan.md) for the full product blueprint.

## License

Proprietary — All rights reserved.
