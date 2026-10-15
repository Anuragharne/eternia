# Guidelines — Eternia AI Companion Platform

> Coding standards, conventions, security practices, and operational rules for the development team. Every contributor must read this before writing code.

---

## Table of Contents

1. [Project Principles](#1-project-principles)
2. [Code Style & Conventions](#2-code-style--conventions)
3. [File & Folder Structure](#3-file--folder-structure)
4. [Git Workflow](#4-git-workflow)
5. [Security Practices](#5-security-practices)
6. [Error Handling](#6-error-handling)
7. [Testing Strategy](#7-testing-strategy)
8. [API Design Rules](#8-api-design-rules)
9. [Frontend Guidelines](#9-frontend-guidelines)
10. [AI/LLM Integration Rules](#10-aillm-integration-rules)
11. [Data Handling & Privacy Rules](#11-data-handling--privacy-rules)
12. [Performance & Cost Rules](#12-performance--cost-rules)
13. [Deployment & Operations](#13-deployment--operations)
14. [Code Review Checklist](#14-code-review-checklist)

---

## 1. Project Principles

These are non-negotiable. Every decision should pass through this filter.

| # | Principle | What It Means |
|:---|:---|:---|
| **P1** | **Empathy First** | We're building for grieving people. Every error message, loading state, and microcopy must be compassionate. No cold, technical language in user-facing surfaces. |
| **P2** | **Privacy by Default** | Data is encrypted at rest, scoped by user, and deletable on demand. No analytics on emotional content. No selling data. Ever. |
| **P3** | **Honesty Over Illusion** | The avatar never pretends to be sentient. Memory gaps are acknowledged, not fabricated. Every AI response disclaims its nature. |
| **P4** | **APIs First, Self-Host Later** | Use paid APIs (ElevenLabs, HeyGen, Gemini) to validate. Only self-host when revenue and scale justify the infrastructure investment. |
| **P5** | **Ship Small, Ship Often** | With 2 engineers, every PR should be mergeable within 1 day. No multi-week feature branches. |

---

## 2. Code Style & Conventions

### 2.1 Python (Backend)

| Rule | Convention |
|:---|:---|
| **Formatter** | `black` (line length: 100) |
| **Linter** | `ruff` |
| **Type hints** | Required on all function signatures |
| **Docstrings** | Google-style. Required on all public functions and classes. |
| **Naming** | `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE` for constants |
| **Imports** | Sorted with `isort`. Grouped: stdlib → third-party → local. |
| **Async** | Use `async/await` for all I/O-bound operations (DB, API calls, S3). |

```python
# ✅ Good
async def get_avatar_memories(
    avatar_id: str,
    user_id: str,
    min_confidence: float = 0.7,
) -> list[MemoryResponse]:
    """Retrieve all memories for an avatar above the confidence threshold.

    Args:
        avatar_id: The avatar to query memories for.
        user_id: Authenticated user ID (used for RLS validation).
        min_confidence: Minimum confidence score to include.

    Returns:
        List of memory responses sorted by relevance.

    Raises:
        HTTPException: If avatar not found or user unauthorized.
    """
    ...

# ❌ Bad
def get_memories(id, uid):  # No types, no docstring, vague names
    ...
```

### 2.2 JavaScript (Frontend)

| Rule | Convention |
|:---|:---|
| **Framework** | Next.js 15 with App Router |
| **Style** | Vanilla CSS with CSS custom properties (design tokens) |
| **Components** | Functional components only. No class components. |
| **State** | `useState` / `useReducer` for local. No global state library until needed. |
| **Naming** | `PascalCase` for components, `camelCase` for variables/functions, `kebab-case` for CSS classes |
| **Files** | One component per file. File name matches component name. |
| **No inline styles for reusable patterns** | Use CSS classes from `globals.css`. Inline styles only for one-off positional adjustments. |

```jsx
// ✅ Good — uses design system classes
<button className="btn btn-primary btn-lg">Get Started</button>

// ❌ Bad — reinvents styles inline
<button style={{ background: 'purple', padding: '12px 24px', borderRadius: '8px' }}>
  Get Started
</button>
```

### 2.3 General

- **No `console.log` in production code.** Use structured logging (Python: `logging`, JS: remove before commit).
- **No hardcoded secrets.** All credentials go in `.env` files. Use `settings.VARIABLE_NAME` in Python.
- **No `any` types.** Be specific. If a type is truly unknown, document why.
- **Comments explain WHY, not WHAT.** The code should be self-explanatory for "what."

---

## 3. File & Folder Structure

### 3.1 Backend

```
backend/
├── app/
│   ├── main.py                    # App factory, middleware, startup
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (env vars)
│   │   ├── auth.py                # JWT verification
│   │   ├── errors.py              # Custom exception classes
│   │   └── dependencies.py        # FastAPI dependency injection
│   ├── models/
│   │   ├── schemas.py             # Pydantic request/response models
│   │   └── database.py            # Supabase client initialization
│   ├── api/
│   │   ├── __init__.py            # Router aggregation
│   │   └── routes/
│   │       ├── avatars.py
│   │       ├── memories.py
│   │       ├── chat.py
│   │       ├── consent.py
│   │       └── export.py
│   └── services/
│       ├── vector_service.py      # Qdrant operations
│       ├── storage_service.py     # S3 operations
│       ├── memory_service.py      # Memory ingestion pipeline
│       ├── chat_service.py        # Conversation engine + RAG
│       ├── embedding_service.py   # Text embedding generation
│       ├── llm_service.py         # Gemini Flash integration
│       └── voice_service.py       # Voice cloning (V1.1: ElevenLabs)
├── tests/
│   ├── conftest.py
│   ├── test_avatars.py
│   ├── test_memories.py
│   ├── test_chat.py
│   └── test_hallucination.py      # Grounding benchmark suite
├── requirements.txt
├── .env.example
└── Dockerfile
```

### 3.2 Frontend

```
frontend/
├── app/
│   ├── globals.css                # Design system
│   ├── layout.js                  # Root layout + metadata
│   ├── page.js                    # Landing page
│   ├── auth/
│   │   ├── login/page.js
│   │   └── signup/page.js
│   ├── onboarding/page.js         # Multi-step onboarding
│   ├── chat/page.js               # Chat interface
│   ├── settings/page.js           # User settings, data export
│   └── memorial/[id]/page.js      # Public memorial page (V1.2)
├── components/
│   ├── ui/                        # Reusable primitives
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   ├── Modal.js
│   │   └── UploadZone.js
│   ├── chat/
│   │   ├── MessageBubble.js
│   │   ├── ChatInput.js
│   │   ├── TypingIndicator.js
│   │   └── GroundingBadge.js
│   ├── onboarding/
│   │   ├── StepIntent.js
│   │   ├── StepConsent.js
│   │   ├── StepPhotos.js
│   │   ├── StepVoice.js
│   │   ├── StepMemories.js
│   │   └── StepTraining.js
│   └── layout/
│       ├── Navbar.js
│       ├── Sidebar.js
│       └── Footer.js
├── lib/
│   ├── api.js                     # API client (fetch wrapper)
│   ├── supabase.js                # Supabase client init
│   └── utils.js                   # Date formatting, helpers
├── hooks/
│   ├── useAuth.js                 # Auth state hook
│   ├── useChat.js                 # Chat state management
│   └── useAvatar.js               # Avatar CRUD hook
├── .env.example
└── package.json
```

### 3.3 Naming Rules

| Item | Convention | Example |
|:---|:---|:---|
| React component files | `PascalCase.js` | `MessageBubble.js` |
| React page files | `page.js` (Next.js convention) | `app/chat/page.js` |
| Python modules | `snake_case.py` | `memory_service.py` |
| CSS classes | `kebab-case` | `.chat-input-wrapper` |
| API routes | `lowercase plural nouns` | `/api/avatars`, `/api/memories` |
| Database tables | `snake_case plural` | `consent_logs`, `chat_messages` |
| Environment variables | `UPPER_SNAKE_CASE` | `GEMINI_API_KEY` |

---

## 4. Git Workflow

### 4.1 Branch Strategy

```
main              ← Production-ready code
├── dev           ← Integration branch (always deployable)
├── feat/XXX      ← Feature branches (short-lived, 1-3 days max)
├── fix/XXX       ← Bug fix branches
└── chore/XXX     ← Maintenance (deps, config, docs)
```

### 4.2 Commit Messages

Follow **Conventional Commits**:

```
<type>(<scope>): <short description>

<body — explain WHY, not what>
```

| Type | Usage |
|:---|:---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `docs` | Documentation only |
| `chore` | Dependencies, config, CI |
| `test` | Adding or fixing tests |
| `style` | CSS, formatting (no logic change) |

```
# ✅ Good
feat(memories): add WhatsApp chat export parser

Parses exported WhatsApp .txt files into individual memory entries.
Handles both 12h and 24h timestamp formats and multi-line messages.

# ❌ Bad
updated stuff
```

### 4.3 Pull Request Rules

- Every PR must be reviewed by the other team member before merge.
- PR description must include: **What changed**, **Why**, **How to test**.
- No PR larger than 500 lines of code changes (excluding generated files).
- Squash-merge into `dev`. Merge `dev` → `main` for releases.

---

## 5. Security Practices

### 5.1 Non-Negotiable Rules

| Rule | Detail |
|:---|:---|
| **Never log sensitive data** | No PII (names, emails), no memory content, no voice data in logs. Log IDs and metadata only. |
| **Never expose internal errors** | Return generic error messages to the client. Log detailed errors server-side. |
| **Always validate on the server** | Client-side validation is UX. Server-side validation is security. Both are required. |
| **Always scope by user_id** | Every database query and Qdrant search MUST filter by `user_id`. No exceptions. |
| **Never trust client input** | Validate file types, sizes, content types. Check ownership before every operation. |
| **Rate limit everything** | Chat: 30 req/min. Upload: 10 req/5min. Auth: 5 req/min. |

### 5.2 File Upload Security

```python
# ✅ Always validate on the server
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

async def validate_upload(file: UploadFile):
    # Check MIME type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Unsupported file type")
    
    # Check actual file size (don't trust Content-Length header)
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(413, "File too large")
    
    # Check magic bytes (don't trust Content-Type header)
    if not is_valid_image(content):
        raise HTTPException(400, "File content doesn't match declared type")
    
    await file.seek(0)  # Reset for downstream processing
```

### 5.3 Prompt Injection Defense

```python
# ✅ User messages are NEVER inserted into the system prompt
# They go into the "user" role only

messages = [
    {"role": "system", "content": system_prompt},       # Controlled by us
    {"role": "user", "content": user_message},           # Untrusted input
]

# ❌ NEVER do this
system_prompt = f"The user said: {user_message}. Now respond as..."
```

---

## 6. Error Handling

### 6.1 Backend Error Pattern

```python
# Define custom exceptions in core/errors.py
class AppError(Exception):
    def __init__(self, code: str, message: str, status: int = 400, details: dict = None):
        self.code = code
        self.message = message
        self.status = status
        self.details = details or {}

class AvatarNotFoundError(AppError):
    def __init__(self, avatar_id: str):
        super().__init__(
            code="AVATAR_NOT_FOUND",
            message="No avatar found with the given ID.",
            status=404,
            details={"avatar_id": avatar_id},
        )

# Register global handler in main.py
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )
```

### 6.2 Frontend Error Pattern

```javascript
// lib/api.js — centralized API client
export async function apiCall(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.error.code, error.error.message, response.status);
  }

  return response.json();
}
```

---

## 7. Testing Strategy

### 7.1 Test Pyramid

```
            /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
           /   E2E Tests (5%)  \        ← Playwright: critical user flows
          /                     \
         /  Integration (25%)    \      ← API tests: route → service → DB
        /                         \
       /    Unit Tests (70%)       \    ← Service logic, parsing, embedding
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### 7.2 Mandatory Test Coverage

| Component | Must Test |
|:---|:---|
| **Memory ingestion** | Parser handles all formats; entities extracted correctly; confidence scoring |
| **RAG retrieval** | Correct memories returned; user isolation works; confidence gating applied |
| **Hallucination defense** | 200+ benchmark queries; <2% hallucination rate; graceful refusals on unknown topics |
| **Consent flow** | Append-only enforcement; revocation cascades; cooling period respected |
| **File upload** | Type validation; size limits; malicious file rejection |
| **Auth** | Invalid tokens rejected; expired tokens rejected; ownership checks enforced |

### 7.3 Hallucination Benchmark Suite

```python
# tests/test_hallucination.py

GROUNDING_TEST_CASES = [
    {
        "query": "Do you remember our trip to Goa?",
        "memories": ["We went to Goa in March 2019. Stayed at a beach house."],
        "expected_behavior": "grounded",
        "must_contain": ["Goa", "2019"],
        "must_not_contain": ["I'm sorry I can't"],  # It should find the memory
    },
    {
        "query": "What did you think of Uncle Raj's wedding?",
        "memories": [],  # No memory about this
        "expected_behavior": "graceful_refusal",
        "must_contain": ["don't recall", "tell me", "remind me"],
        "must_not_contain": ["wedding was beautiful", "I loved"],  # Must NOT fabricate
    },
    # ... 200+ test cases covering edge cases
]
```

---

## 8. API Design Rules

| Rule | Detail |
|:---|:---|
| **RESTful nouns** | `/api/avatars`, not `/api/createAvatar` |
| **Consistent plurals** | Always plural nouns: `avatars`, `memories`, `sessions` |
| **HTTP methods** | `GET` = read, `POST` = create, `PATCH` = partial update, `DELETE` = remove |
| **Pagination** | Use `?skip=0&limit=50` pattern. Default limit: 50. Max limit: 100. |
| **Status codes** | 200 = success, 201 = created, 204 = deleted (no body), 4xx = client error, 5xx = server error |
| **Response envelope** | Success: return data directly. Error: wrap in `{"error": {...}}` |
| **Dates** | ISO 8601 with timezone: `2026-09-05T12:00:00Z` |
| **IDs** | UUID v4 strings everywhere |

---

## 9. Frontend Guidelines

### 9.1 Design System Usage

- **Always use design tokens** from `globals.css`. Never hardcode colors, sizes, or fonts.
- **Component composition** over complex props. Build small, compose into pages.
- **Loading states** for every async operation. No blank screens.
- **Empty states** for every list. Never show a blank page — show helpful guidance.

### 9.2 Empathetic Microcopy

| Context | ❌ Bad | ✅ Good |
|:---|:---|:---|
| Empty chat | "No messages" | "Begin a conversation with [Name]. They remember what you've shared." |
| Upload error | "Upload failed" | "We couldn't process that file. Could you try a different one?" |
| Memory limit | "Limit reached" | "You've filled your memory collection. Upgrade to add more memories." |
| Avatar loading | (spinner) | "Building [Name]'s presence..." |
| Hallucination gap | "No data available" | "I don't recall that — but I'd love for you to tell me about it." |

### 9.3 Accessibility

- All images have `alt` text.
- All interactive elements have `aria-label`.
- Focus states are visible on all buttons and inputs.
- Color contrast meets WCAG AA (4.5:1 minimum).
- Keyboard navigable: Tab order makes sense.

---

## 10. AI/LLM Integration Rules

### 10.1 Prompt Hygiene

| Rule | Detail |
|:---|:---|
| **System prompt is ours** | Never interpolate user input into the system prompt. |
| **User message is untrusted** | Always in `"role": "user"`. Sanitize before any processing. |
| **Version control prompts** | Store prompts in YAML files or database. Track changes. |
| **Temperature** | Use `temperature: 0.7` for conversation. `temperature: 0.1` for verification. |
| **Max tokens** | Set `max_output_tokens` to prevent runaway generation. Chat: 500 tokens. |

### 10.2 Grounding Rules (Enforced in Every Prompt)

```yaml
# prompts/grounding_rules.yaml
rules:
  - "You ONLY know what is in your retrieved memory context."
  - "If a memory is not in your context, say 'I don't recall that' — NEVER invent."
  - "Every factual claim must reference a [Memory ID] from your context."
  - "If you're uncertain, express uncertainty. Never guess at memories."
  - "You are an AI. If asked, acknowledge this honestly and gently."
  - "The user may type in Hinglish. You must understand it, but your response MUST be generated entirely in pure English OR entirely in pure Hindi (Devanagari script). NEVER mix scripts, as it breaks the Text-to-Speech engine."
```

### 10.3 Embedding Model

| Property | Value |
|:---|:---|
| **Model** | `text-embedding-004` (Google) |
| **Dimension** | 768 |
| **Max input** | 2048 tokens per chunk |
| **Chunking strategy** | Semantic chunking with 200-token target, 50-token overlap |
| **Batch size** | 50 texts per API call (cost optimization) |

---

## 11. Data Handling & Privacy Rules

### 11.1 Data Classification

| Classification | Examples | Handling |
|:---|:---|:---|
| **Critical** | Voice recordings, face photos, raw memories | AES-256 encryption, user-scoped storage, deletion within 24h on request |
| **Sensitive** | Chat messages, personality traits, emotional state | Encrypted at rest, ephemeral by default, opt-in persistence |
| **Internal** | User IDs, avatar IDs, timestamps | Standard database security, not exposed in error messages |
| **Public** | Landing page content, pricing | No special handling |

### 11.2 Data Retention

| Data Type | Default Retention | On Consent Revocation |
|:---|:---|:---|
| Uploaded files (S3) | Until user deletes | Deleted within 24h |
| Vector embeddings (Qdrant) | Until user deletes | Deleted immediately |
| Memory text (Postgres) | Until user deletes | Soft-deleted (is_active=false) |
| Chat messages (Redis) | 24h (session only) | Deleted immediately |
| Chat messages (Postgres) | If user opts-in to persistence | Deleted within 24h |
| Consent logs | Forever | Retained for compliance |
| User account | Until user requests deletion | Full account purge within 30 days |

### 11.3 Logging Rules

```python
# ✅ Safe to log
logger.info("Memory created", extra={"memory_id": memory.id, "avatar_id": avatar.id, "source_type": "manual"})

# ❌ NEVER log this
logger.info(f"Memory content: {memory.content}")  # PII!
logger.info(f"User email: {user.email}")           # PII!
logger.info(f"Voice file uploaded: {file.name}")    # Biometric metadata!
```

---

## 12. Performance & Cost Rules

### 12.1 Latency Budgets

| Operation | Target | Max Acceptable |
|:---|:---|:---|
| Chat response (text) | < 2s | < 5s |
| Chat response (voice, V1.1) | < 3s TTFB | < 6s TTFB |
| Memory ingestion (single) | < 5s | < 10s |
| Memory search (Qdrant) | < 100ms | < 300ms |
| Photo upload | < 3s | < 10s |
| Page load (frontend) | < 1.5s | < 3s |

### 12.2 Cost Guards

| Rule | Detail |
|:---|:---|
| **Cache persona prompts** | Don't re-assemble per request. Cache in Redis (1h TTL). |
| **Cache embeddings** | Don't re-embed the same text. Hash content and check Qdrant first. |
| **Limit retrieved context** | Max 5 memories injected per LLM call. More isn't better. |
| **Batch embeddings** | When importing multiple memories, batch into groups of 50. |
| **Free tier limits** | 50 memories, 5 convos/month. Enforce server-side, not just UI. |
| **Monitor spend** | Set billing alerts at $50/day for Gemini, $50/day for ElevenLabs. |

---

## 13. Deployment & Operations

### 13.1 Environment Tiers

| Tier | Purpose | Backend | Frontend |
|:---|:---|:---|:---|
| **Local** | Development | `uvicorn --reload` on `:8000` | `next dev` on `:3000` |
| **Staging** | Pre-production testing | Railway / Fly.io | Vercel Preview |
| **Production** | Live users | Railway / Fly.io | Vercel Production |

### 13.2 Environment Variable Management

- **Local:** `.env` file (gitignored).
- **Staging/Production:** Platform-managed secrets (Railway / Vercel environment variables).
- **Never commit `.env` files.** Only `.env.example` with placeholder values.
- **Rotate keys quarterly** or immediately if exposed.

### 13.3 Health Checks

```
GET /health → {"status": "healthy", "service": "Eternia"}
```

Monitor:
- Backend health endpoint every 60s.
- Qdrant collection status weekly.
- S3 bucket accessibility weekly.
- Redis connectivity on startup.

---

## 14. Code Review Checklist

Before approving any PR, verify:

### Security
- [ ] User input is validated on the server.
- [ ] All DB queries are scoped by `user_id`.
- [ ] No secrets or PII in logs.
- [ ] File uploads validated (type, size, magic bytes).
- [ ] No user input interpolated into system prompts.

### Quality
- [ ] Functions have type hints and docstrings.
- [ ] Error cases are handled (not just happy path).
- [ ] Loading and empty states exist in UI.
- [ ] No hardcoded values — uses constants or config.

### Privacy
- [ ] New data fields classified (critical/sensitive/internal/public).
- [ ] Deletion cascades implemented for any new data type.
- [ ] Consent status checked before accessing avatar data.

### Empathy
- [ ] User-facing copy is compassionate and clear.
- [ ] Error messages don't blame the user.
- [ ] AI-generated content is labeled as AI.

### Performance
- [ ] No N+1 queries.
- [ ] Caching used where appropriate.
- [ ] Pagination implemented for list endpoints.
- [ ] No unnecessary re-renders in React components.
