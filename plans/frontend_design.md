# Frontend Design Plan — Eternia AI Companion

> Complete page-by-page UI specification covering layout, component hierarchy, interaction design, animation strategy, and responsive breakpoints. Every page has a wireframe description, a component list, and detailed design decisions.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Typography System](#2-typography-system)
3. [Spacing & Layout Grid](#3-spacing--layout-grid)
4. [Animation & Motion System](#4-animation--motion-system)
5. [Component Library](#5-component-library)
6. [Page Designs](#6-page-designs)
   - [6.1 Landing Page](#61-landing-page)
   - [6.2 Auth Pages (Login / Signup)](#62-auth-pages-login--signup)
   - [6.3 Onboarding Flow (6 Steps)](#63-onboarding-flow-6-steps)
   - [6.4 Chat Interface](#64-chat-interface)
   - [6.5 Settings Page](#65-settings-page)
   - [6.6 Memorial Page (V1.2)](#66-memorial-page-v12)
7. [Responsive Strategy](#7-responsive-strategy)
8. [Iconography & Imagery](#8-iconography--imagery)
9. [Emotional Design Patterns](#9-emotional-design-patterns)
10. [Current Problems & Fixes](#10-current-problems--fixes)

---

## 1. Design Principles

These principles override all aesthetic preferences. When in doubt, refer to this list.

| # | Principle | Implementation |
|:---|:---|:---|
| **D1** | **Warmth over Precision** | Rounded corners (12-24px), soft shadows, warm gradients. No sharp edges, no hard lines. |
| **D2** | **Depth through Layers** | Use the 5-layer surface system from `color_grading.md`. Every element should feel like it floats at a specific altitude. |
| **D3** | **Restraint** | Maximum 2 accent colors per screen. Maximum 1 gradient element per viewport. White space is not wasted space—it is breathing room. |
| **D4** | **Motion = Meaning** | Every animation must communicate something (entrance, exit, success, loading). No animation for decoration. |
| **D5** | **Mobile-Aware, Desktop-First** | Design for 1440px first. Gracefully collapse to 768px (tablet) and 375px (mobile). |

---

## 2. Typography System

### Font Stack

| Usage | Font Family | Fallback | Source |
|:---|:---|:---|:---|
| **Headings** (`h1`–`h6`), navigation brand | **Outfit** | `system-ui, sans-serif` | Google Fonts |
| **Body text**, inputs, buttons, descriptions | **Inter** | `system-ui, sans-serif` | Google Fonts |

### Type Scale

| Token | Size | Weight | Line Height | Use Case |
|:---|:---|:---|:---|:---|
| `--text-6xl` | 3.75rem (60px) | 800 | 1.15 | Landing hero headline only |
| `--text-5xl` | 3rem (48px) | 700 | 1.15 | Section headlines |
| `--text-4xl` | 2.25rem (36px) | 700 | 1.15 | Page titles (Chat, Settings) |
| `--text-3xl` | 1.875rem (30px) | 600 | 1.3 | Card titles, modal headers |
| `--text-2xl` | 1.5rem (24px) | 600 | 1.3 | Subsection headers |
| `--text-xl` | 1.25rem (20px) | 500 | 1.3 | Feature card titles |
| `--text-lg` | 1.125rem (18px) | 400 | 1.6 | Emphasized body text |
| `--text-base` | 1rem (16px) | 400 | 1.6 | Default body text |
| `--text-sm` | 0.875rem (14px) | 400 | 1.6 | Captions, metadata, timestamps |
| `--text-xs` | 0.75rem (12px) | 500 | 1.6 | Badges, micro-labels |

### Typography Rules

1. **Never use more than 3 font weights on a single screen.** A typical screen uses: 400 (body), 500 (labels), 600 or 700 (headings).
2. **Maximum line length: 65 characters (roughly 600px).** Beyond this, reading comprehension drops.
3. **Letter-spacing on uppercase text: +0.05em.** Prevents ALL-CAPS text from looking cramped.

---

## 3. Spacing & Layout Grid

### Spacing Scale

All spacing is derived from a **4px base unit** for mathematical consistency:

| Token | Value | Common Use |
|:---|:---|:---|
| `--space-1` | 4px | Icon-to-text gap inside a button |
| `--space-2` | 8px | Gap between badge elements |
| `--space-3` | 12px | Input internal padding (left/right) |
| `--space-4` | 16px | Card internal padding, form group gap |
| `--space-6` | 24px | Section padding (vertical), card gap |
| `--space-8` | 32px | Major section dividers |
| `--space-12` | 48px | Page section top/bottom padding |
| `--space-16` | 64px | Hero section vertical padding |
| `--space-24` | 96px | Landing page section spacing |

### Grid System

| Page | Grid | Details |
|:---|:---|:---|
| Landing page | Single column, centered | Max-width: 1200px, auto margins |
| Auth pages | Centered card | Card width: 420px max |
| Onboarding | Centered card | Card width: 560px max |
| Chat | 2-column: sidebar + main | Sidebar: 280px fixed. Main: fluid. |
| Settings | 2-column: nav + content | Nav: 240px. Content: fluid, max 720px. |

---

## 4. Animation & Motion System

### Core Principle
Animation must feel **organic and gentle**—like breathing, not like snapping. Users are in an emotional state; jarring transitions feel hostile.

### Timing Tokens

| Token | Duration | Easing | Use Case |
|:---|:---|:---|:---|
| `--transition-fast` | 150ms | `ease` | Button hover, icon color change |
| `--transition-base` | 250ms | `ease` | Card hover lift, input focus ring |
| `--transition-slow` | 400ms | `ease` | Page transitions, modal open/close |
| `--transition-spring` | 500ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Onboarding step transitions, success checkmarks |

### Keyframe Animations

```css
/* Fade in from below — used for page content entrance */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Subtle float — used for hero orbs, ambient decoration */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-20px); }
}

/* Pulse glow — used for "typing..." indicator */
@keyframes pulseGlow {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 1; }
}

/* Slide in from left — used for chat messages */
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Slide in from right — used for user's own messages */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Scale pop — used for success states, checkmarks */
@keyframes scalePop {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
```

### Animation Rules

1. **Never animate `width` or `height` directly.** Use `transform: scale()` instead — it's GPU-accelerated and buttery smooth.
2. **Stagger list items by 50ms each.** When multiple cards or messages appear, each one enters 50ms after the previous. This creates a "cascade" effect that feels alive.
3. **`prefers-reduced-motion` respect.** Wrap all keyframe animations in a media query that disables them for users with motion sensitivity:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Component Library

### 5.1 Buttons

| Variant | Visual | Height | Padding | Border Radius | Hover Effect |
|:---|:---|:---|:---|:---|:---|
| `btn-primary` | Gradient fill, white text | 44px | 0 24px | 12px | Glow shadow + `scale(1.02)` |
| `btn-secondary` | Transparent, border, light text | 44px | 0 24px | 12px | Background fills to `--bg-card-hover` |
| `btn-ghost` | No border, muted text | 36px | 0 16px | 8px | Text brightens to `--text-primary` |
| `btn-danger` | Red-tinted background | 44px | 0 24px | 12px | Stronger red background |
| `btn-sm` | Reduced size | 32px | 0 12px | 8px | Same as parent variant |
| `btn-lg` | Enlarged size | 52px | 0 32px | 16px | Same as parent variant |

### 5.2 Cards

```
┌─────────────────────────────────────┐
│  Glass Card                          │
│  ─────────────────────────────────── │
│  Background: rgba(255,255,255,0.04)  │
│  Border: 1px solid rgba(…, 0.08)     │
│  Border-radius: 16px                 │
│  Padding: 24px                       │
│  backdrop-filter: blur(12px)         │
│  Hover: border → rgba(…, 0.15)       │
│         translateY(-2px)             │
│         shadow → --shadow-md         │
└─────────────────────────────────────┘
```

### 5.3 Inputs

| State | Border | Background | Shadow |
|:---|:---|:---|:---|
| Default | `--border-default` | `--color-surface-overlay` | none |
| Hover | `--border-strong` | Same | none |
| Focus | `--brand-primary` at 50% opacity | Same | `0 0 0 3px rgba(139,92,246,0.15)` |
| Error | `--color-error` at 50% opacity | Same | `0 0 0 3px rgba(248,113,113,0.1)` |
| Disabled | `rgba(…, 0.05)` | `rgba(…, 0.02)` | none |

Height: 44px. Padding: 12px 16px. Border-radius: 10px. Font: Inter 16px.

### 5.4 Badges / Tags

Small pill-shaped indicators. Used for grounding status, memory source type, plan tier.

- Height: 24px. Padding: 0 10px. Border-radius: `--radius-full`.
- Font: Inter 12px, weight 500, uppercase, letter-spacing +0.05em.
- Background: Contextual (green for grounded, yellow for warning, violet for brand).

### 5.5 Upload Zone

A dashed-border area for drag-and-drop file uploads.

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                                       │
│       📁  Drag files here             │
│       or click to browse              │
│                                       │
│       Supported: .txt, .pdf, .docx    │
│                                       │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Border: 2px dashed `--border-default`.
- On hover: border color → `--brand-primary`, background → `rgba(139,92,246,0.05)`.
- On drag-over: border → solid, glow shadow activates.

### 5.6 Modal / Dialog

- Overlay: `rgba(0, 0, 0, 0.6)` with `backdrop-filter: blur(4px)`.
- Modal card: `--color-surface-overlay` background, 24px radius, max-width 480px.
- Entrance: `fadeInUp` at `--transition-slow`.
- Close button: top-right, ghost style, "✕" icon.

---

## 6. Page Designs

### 6.1 Landing Page — Premium 3D Hero Redesign

**Purpose:** Convert visitors into sign-ups. Must immediately communicate: *"This is not a gimmick. This is a premium, trustworthy, beautiful tool."*

**Visual Direction:** Warm orange-to-amber gradient. Floating rounded card. Interactive 3D character at centre. Inspired by glossy product showcase layouts — generous spacing, rounded everything, soft shadows.

#### New Dependencies Required

```json
{
  "@react-three/fiber": "^9.x",
  "@react-three/drei": "^10.x",
  "three": "^0.170.x",
  "framer-motion": "^12.x"
}
```

#### Hero Layout Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  FULL-SCREEN WARM GRADIENT BACKGROUND                           │
│  linear-gradient(160deg, #FF8C42 0%, #FFB347 40%, #FFF1D0 100%) │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  FLOATING HERO CARD (rounded 32px, soft shadow, white)  │     │
│  │                                                         │     │
│  │  ┌─────────────────────────────────────────────────┐    │     │
│  │  │  PILL NAV (centred, floating)                    │    │     │
│  │  │  [✦ Logo]  [Home] [How it works] [Pricing]      │    │     │
│  │  │            [Contact]  [👤 Profile]               │    │     │
│  │  └─────────────────────────────────────────────────┘    │     │
│  │                                                         │     │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐     │     │
│  │  │ LEFT COL │  │  CENTRE      │  │  RIGHT COL   │     │     │
│  │  │          │  │              │  │              │     │     │
│  │  │ H1:      │  │  ┌────────┐  │  │  Style       │     │     │
│  │  │ "Keep    │  │  │  3D    │  │  │  Selector    │     │     │
│  │  │  their   │  │  │ AVATAR │  │  │  ○ Realistic │     │     │
│  │  │  voice   │  │  │ MODEL  │  │  │  ○ Soft      │     │     │
│  │  │  close." │  │  │        │  │  │  ○ Stylized  │     │     │
│  │  │          │  │  │ (idle  │  │  │              │     │     │
│  │  │ Subtitle │  │  │  anim, │  │  │  Mood/Voice  │     │     │
│  │  │          │  │  │  cursor│  │  │  Selector    │     │     │
│  │  │ [Create  │  │  │  track)│  │  │              │     │     │
│  │  │  your    │  │  └────────┘  │  │              │     │     │
│  │  │  avatar] │  │              │  │              │     │     │
│  │  └──────────┘  └──────────────┘  └──────────────┘     │     │
│  │                                                         │     │
│  │  ┌─────────────────────────────────────────────────┐    │     │
│  │  │  BOTTOM BAR                                      │    │     │
│  │  │  [Social icons]  "Memories, brought to life."    │    │     │
│  │  │                              [Alt avatar thumb]  │    │     │
│  │  └─────────────────────────────────────────────────┘    │     │
│  │                                                         │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

BELOW THE HERO (scrollable sections — same as before):
├── FEATURES SECTION (4 cards)
├── HOW IT WORKS (3-step flow)
├── PRIVACY SECTION
├── PRICING SECTION (3 tiers)
├── CTA BANNER
└── FOOTER
```

#### Component Hierarchy

```
frontend/
├── app/page.js                        ← Orchestrates all sections
├── components/
│   └── landing/
│       ├── Hero.js                    ← Full hero section (gradient + card)
│       ├── NavPill.js                 ← Floating pill navigation bar
│       ├── AvatarCanvas.js            ← React Three Fiber canvas + 3D model
│       ├── PlaceholderAvatar.js        ← Capsule+sphere fallback if no .glb
│       ├── StyleSelector.js           ← Right column style chips
│       ├── AvatarThumb.js             ← Bottom-right thumbnail (click to swap)
│       ├── Features.js                ← Feature cards section
│       ├── HowItWorks.js              ← 3-step flow section
│       ├── Privacy.js                 ← Privacy promises section
│       ├── Pricing.js                 ← Pricing cards section
│       ├── CtaBanner.js               ← Final CTA gradient banner
│       └── Footer.js                  ← Footer links
```

#### 3D Character Specifications

| Property | Value |
|:---|:---|
| **Model format** | `.glb` (Draco-compressed) |
| **Model path** | `/public/models/avatar.glb` |
| **Fallback** | Procedural capsule body (height 1.6) + sphere head (radius 0.3), same warm gradient material |
| **Lighting** | Soft 3-point studio: key light (warm white, intensity 1.2), fill light (amber, intensity 0.4), rim light (orange, intensity 0.6) |
| **Environment** | `@react-three/drei` `Environment` preset: `"studio"` |
| **Ground shadow** | `ContactShadows` from drei: opacity 0.4, blur 2.5, positioned at y=0 |
| **Idle animation** | Breathing: subtle `scale` oscillation on torso (1.0 → 1.015, 3s cycle, ease-in-out) |
| **Blink animation** | If model has `blendShapes.eyeBlinkLeft/Right`: random blink every 2-5 seconds (200ms close, 150ms open) |
| **Cursor tracking** | Head rotates toward mouse position: max ±15° horizontal, ±10° vertical. Uses `useFrame` + lerp for smoothness |
| **Drag interaction** | Horizontal drag-rotate only via `OrbitControls` with: `enableZoom={false}`, `enablePan={false}`, `minPolarAngle/maxPolarAngle` locked |
| **Device pixel ratio** | Capped at `Math.min(window.devicePixelRatio, 2)` via `<Canvas dpr={[1, 2]}>` |
| **Tab visibility** | Pause `useFrame` rendering when `document.hidden === true` via `useEffect` listener |

#### Pill Navigation Design

```
┌──────────────────────────────────────────────────┐
│  ✦ Eternia   │  Home  How it works  Pricing      │
│              │  Contact              👤  🛒       │
└──────────────────────────────────────────────────┘
```

- Shape: Full pill (border-radius: 9999px).
- Background: `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)`.
- Shadow: `0 4px 24px rgba(0, 0, 0, 0.08)`.
- Active link: `--hero-accent` color (#FF8C42) text + subtle underline dot.
- Position: Floating, `position: absolute; top: 24px; left: 50%; transform: translateX(-50%)`.
- Width: max-content with horizontal padding of 32px.

#### Style Selector Chips (Right Column)

Three circular chips stacked vertically:

| Chip | Label | Active Style |
|:---|:---|:---|
| ○ | **Realistic** | Filled with `--hero-accent`, white text |
| ○ | **Soft** | Filled with `--hero-accent`, white text |
| ○ | **Stylized** | Filled with `--hero-accent`, white text |

- Size: 48px diameter with label beside it.
- Inactive: White border, transparent fill.
- Transition: `framer-motion` `layoutId` shared animation on the active indicator.
- **V1 behavior:** Visual selector only (demonstrates future avatar style options). No backend effect yet.

#### Avatar Thumbnail (Bottom Right)

- Size: 64×64px, rounded 16px.
- Border: 3px solid white, with a subtle `box-shadow`.
- Content: A second avatar preview image or the placeholder mesh.
- On click: `framer-motion` `AnimatePresence` smoothly crossfades the 3D model in the canvas AND transitions the hero card's accent border color.

#### Hero Color Tokens (Landing Page Only)

These tokens override the global dark theme **only** on the landing page:

```css
.hero-page {
  --hero-bg-start: #FF8C42;
  --hero-bg-mid: #FFB347;
  --hero-bg-end: #FFF1D0;
  --hero-gradient: linear-gradient(160deg, var(--hero-bg-start) 0%, var(--hero-bg-mid) 40%, var(--hero-bg-end) 100%);
  --hero-card-bg: #ffffff;
  --hero-card-radius: 32px;
  --hero-card-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
  --hero-text-primary: #1a1a2e;
  --hero-text-secondary: #4a4a5a;
  --hero-accent: #FF8C42;
  --hero-accent-hover: #FF7A2E;
  --hero-btn-bg: #ffffff;
  --hero-btn-text: #1a1a2e;
}
```

> **Critical:** The warm orange gradient is **landing page only.** Once the user logs in, the app reverts to the global dark-violet theme. The landing page is a warm invitation; the interior is a private, intimate space.

#### Responsive Behavior (Landing Hero)

| Breakpoint | Layout Change |
|:---|:---|
| **Desktop (≥1024px)** | 3-column: text left, 3D centre, selectors right. Pill nav full-width. |
| **Tablet (768–1023px)** | 2-column: text left, 3D right. Selectors move below as horizontal scroll row. |
| **Mobile (<768px)** | Single column stacked: Pill nav collapses to hamburger. Text above, 3D below (shorter canvas height: 300px), selectors as horizontal scroll chips. |

#### Performance Rules

1. **Lazy-load the Canvas:** Wrap `<Canvas>` in `<Suspense fallback={<HeroSkeleton />}>`. The skeleton shows a pulsing gradient card with a placeholder silhouette.
2. **Draco compression:** The `.glb` model must be Draco-compressed. Target: <2MB file size.
3. **DPR cap:** `<Canvas dpr={[1, 2]}>` — never render at 3x on Retina displays.
4. **Tab visibility:** Add a `visibilitychange` listener. When tab is hidden, set `frameloop="demand"` to stop burning GPU cycles.
5. **No Three.js on mobile if GPU is weak:** Use `navigator.gpu` or a simple WebGL capability check. If the device can't handle it, show a static image instead of the 3D canvas.

#### Key Design Decisions (Updated)

- **Warm gradient landing → dark interior:** The landing page uses a warm, inviting orange gradient to feel approachable and human. The moment the user enters the app (login, onboarding, chat), the palette switches to the dark-violet intimate theme. This transition mirrors the emotional journey: public warmth → private intimacy.
- **No stock photos.** The 3D character IS the hero visual. No need for manipulative stock imagery.
- **Pill nav replaces the old sticky navbar** on the landing page only. Internal pages keep the dark glass navbar.
- **Placeholder 3D character is mandatory.** If no `.glb` is loaded, a procedural capsule-and-sphere avatar renders with the same warm materials. The page must never show a broken/empty canvas.

---

### 6.2 Auth Pages (Login / Signup)

**Purpose:** Get the user into the product with minimum friction.

#### Layout

```
┌──────────────────────────────────────┐
│         Full-screen split            │
│  ┌──────────┐  ┌──────────────────┐  │
│  │           │  │                  │  │
│  │  Decorati │  │  Auth Card       │  │
│  │  ve panel │  │  ─────────────── │  │
│  │  (violet  │  │  Logo            │  │
│  │  gradient │  │  H2: Welcome     │  │
│  │  + subtle │  │  [Email input]   │  │
│  │  pattern) │  │  [Password input]│  │
│  │           │  │  [Submit button] │  │
│  │           │  │  Link: Sign up / │  │
│  │           │  │  Forgot password │  │
│  └──────────┘  └──────────────────┘  │
└──────────────────────────────────────┘
```

#### Design Decisions

- **Split-screen layout.** Left side: decorative gradient with a subtle geometric pattern or the Eternia logo watermark. Right side: the form card. On mobile, the decorative panel disappears and the form becomes full-screen.
- **Social login buttons:** Google and Apple sign-in above the email form, separated by "— or —" divider. 
- **Password visibility toggle:** Eye icon inside the password input field.
- **Form validation:** Inline error messages below each field in `--color-error`, animated with `fadeInUp`.

---

### 6.3 Onboarding Flow (6 Steps)

**Purpose:** Guide the user through avatar creation with emotional care. Each step should feel like a conversation, not a form.

#### Step Layout (Shared Shell)

```
┌──────────────────────────────────────┐
│  Navbar: [✦ Eternia]  Step 3 of 6   │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Progress Bar (6 segments)     │  │
│  │  ████████░░░░░░░░░░░░░░░░░░░  │  │
│  ├────────────────────────────────┤  │
│  │                                │  │
│  │  Step Content (varies)         │  │
│  │  - Header (warm, empathetic)   │  │
│  │  - Form / Upload area          │  │
│  │  - Helper text                 │  │
│  │                                │  │
│  ├────────────────────────────────┤  │
│  │  [← Back]           [Next →]  │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

#### Step-by-Step Content

| Step | Title | Content | Key UX Detail |
|:---|:---|:---|:---|
| **1. Who** | "Who would you like to remember?" | Name input, relationship dropdown, living/deceased radio. Bio textarea. | Radio buttons styled as large selectable cards, not tiny circles. |
| **2. Consent** | "A promise of respect" | Two checkboxes with full legal text expandable via accordion. | Checkboxes are oversized (24×24px). Both required before "Next" enables. |
| **3. Photos** | "Share a photo of [Name]" | Single photo upload zone. Preview with face-detection crop indicator. | Show a gentle note: "One clear photo is all we need." |
| **4. Voice** | "Do you have a recording of [Name]'s voice?" | Audio upload zone OR "No recording available" option. Audio playback preview. | If no audio: show reassuring message, not an error. "That's perfectly okay. We'll use a gentle, neutral voice." |
| **5. Memories** | "What do you remember about [Name]?" | 3 guided prompts (favorite phrase, a shared memory, their personality). Bulk file upload below. | Prompts feel like a conversation: "What's something [Name] always used to say?" |
| **6. Creating** | "Building [Name]'s presence..." | Animated progress: processing indicator with 4 sub-steps (parsing, understanding, embedding, ready). | Each sub-step shows a checkmark animation when complete. No generic spinner. |

#### Step Transition Animation

When the user clicks "Next":
1. Current step fades out to the left (`slideOutLeft`, 250ms).
2. New step fades in from the right (`slideInRight`, 300ms, 100ms delay).
3. Progress bar segment fills with `--gradient-brand` using a smooth width transition.

---

### 6.4 Chat Interface

**Purpose:** The core product experience. Must feel like a real conversation, not a tech demo.

#### Layout

```
┌──────────────────────────────────────────────┐
│  Navbar (simplified)                          │
│  [✦ Eternia]               [⚙ Settings]     │
├─────────┬────────────────────────────────────┤
│         │  Chat Header                        │
│ Sidebar │  ┌──────────────────────────────┐   │
│         │  │ 👩 Amma                      │   │
│ ┌─────┐ │  │ ● Online    [📞] [⚙] [📋]  │   │
│ │Compa│ │  └──────────────────────────────┘   │
│ │nions│ │                                     │
│ │ List│ │  Messages Area                      │
│ │     │ │  ┌─────────────────────────────┐    │
│ │👩   │ │  │ Avatar bubble (left-aligned)│    │
│ │Amma │ │  │ + grounding badge           │    │
│ │     │ │  └─────────────────────────────┘    │
│ │👴   │ │         ┌─────────────────────┐     │
│ │Grand│ │         │ User bubble (right) │     │
│ │pa   │ │         └─────────────────────┘     │
│ │     │ │  ┌─────────────────────────────┐    │
│ │     │ │  │ Avatar bubble               │    │
│ │     │ │  │ ● Typing...                 │    │
│ │     │ │  └─────────────────────────────┘    │
│ └─────┘ │                                     │
│         │  Input Area                         │
│ + New   │  ┌──────────────────────────────┐   │
│ Memory  │  │ [😊] Message...    [📎] [➤] │   │
│ count   │  └──────────────────────────────┘   │
├─────────┴────────────────────────────────────┤
```

#### Chat Message Bubbles

**Avatar Messages (left-aligned):**
- Small circular avatar photo (36px) to the left.
- Bubble: `--bg-card` background, `--border-subtle` border, 12px radius.
- Bottom-left: timestamp in `--text-muted`.
- Bottom-right: grounding badge (green checkmark or yellow warning).
- Entrance animation: `slideInLeft` 300ms.

**User Messages (right-aligned):**
- No avatar photo.
- Bubble: `--gradient-glass` background, `rgba(139,92,246,0.2)` border.
- Bottom-right: timestamp in `--text-muted`.
- Entrance animation: `slideInRight` 300ms.

**Typing Indicator:**
- Three dots pulsing with `pulseGlow` animation, staggered by 200ms each.
- Text: "[Name] is typing..." in `--text-muted`.

#### Sidebar Design

- Width: 280px, fixed. Background: `--color-surface-raised`.
- Each companion: 56px row with photo thumbnail (40px circle), name, last-chat time.
- Active companion: left 3px border in `--brand-primary`, background `--gradient-glass`.
- Bottom section: memory count badge, "+ New Companion" button.
- **Collapsible on tablet/mobile:** Hamburger icon in navbar toggles sidebar as an overlay.

---

### 6.5 Settings Page

**Purpose:** Account management, data export, consent management, billing.

#### Layout

```
┌──────────────────────────────────────────────┐
│  Navbar                                       │
├──────────┬───────────────────────────────────┤
│          │                                    │
│  Side    │  Settings Content (max 720px)      │
│  Nav     │                                    │
│          │  Section: Profile                  │
│  [Prof]  │  ─────────────────────────────     │
│  [Plan]  │  Name, email, photo, timezone      │
│  [Data]  │                                    │
│  [Conse] │  Section: Plan & Billing           │
│  [Dange] │  ─────────────────────────────     │
│          │  Current plan, upgrade CTA          │
│          │                                    │
│          │  Section: Data Management           │
│          │  ─────────────────────────────     │
│          │  [Export All Data]  [Download]      │
│          │                                    │
│          │  Section: Danger Zone               │
│          │  ─────────────────────────────     │
│          │  [Delete Account] (red border)     │
│          │                                    │
└──────────┴───────────────────────────────────┘
```

#### Design Decisions

- **Danger Zone section:** Red-tinted card border (`rgba(248,113,113,0.2)`). Delete button triggers a modal requiring the user to type "DELETE" to confirm. This is a grief-tech app — accidental data loss would be devastating.
- **Data Export:** Shows a progress bar during ZIP generation. Download link appears when ready.

---

### 6.6 Memorial Page (V1.2)

**Purpose:** A public, shareable tribute page for a deceased loved one. Can be linked from obituaries or printed as a QR code.

#### Layout

```
┌──────────────────────────────────────────────┐
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │  Hero: Full-width photo with overlay │   │
│   │  Name, dates, relationship           │   │
│   │  "In Loving Memory"                  │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   Photo Gallery (masonry grid)               │
│   ┌─────┐ ┌───────┐ ┌─────┐                │
│   │     │ │       │ │     │                 │
│   │     │ │       │ └─────┘                 │
│   └─────┘ └───────┘ ┌───────────┐           │
│   ┌───────────┐     │           │           │
│   │           │     │           │           │
│   └───────────┘     └───────────┘           │
│                                              │
│   Curated Memories Section                   │
│   ─────────────────────────                  │
│   Selected memories displayed as cards       │
│   with soft backgrounds and quotes           │
│                                              │
│   Optional: "Share a Memory" form            │
│   (if guest interaction is enabled)          │
│                                              │
│   Footer: "Created with Eternia"             │
│   QR Code + shareable link                   │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 7. Responsive Strategy

### Breakpoints

| Name | Width | Key Changes |
|:---|:---|:---|
| **Desktop** | ≥ 1024px | Full layout: sidebar + main content side-by-side |
| **Tablet** | 768px – 1023px | Sidebar collapses to hamburger overlay. Feature grid: 2 columns. |
| **Mobile** | < 768px | Single column. Auth decorative panel hidden. Stacked layouts. Chat input becomes fixed-bottom. |

### Critical Mobile Adjustments

1. **Chat sidebar** → Swipe-accessible drawer (or hamburger toggle).
2. **Hero text** → `--text-4xl` instead of `--text-6xl`. CTAs stack vertically.
3. **Feature cards** → Single column, full-width.
4. **Onboarding card** → Full-screen, no margins.
5. **Chat input** → Fixed to bottom of viewport with `position: sticky`.

---

## 8. Iconography & Imagery

### Icon Strategy

- **No external icon library in MVP.** Use Unicode emoji for now (📸, 🎤, 📖, 🛡️, ⚙️).
- **Phase 2 upgrade:** Migrate to **Lucide Icons** (open source, consistent stroke width, MIT license). Import only the icons we use to minimize bundle size.

### Imagery Rules

1. **No stock photos of people.** A grief-tech product showing generic "happy family" stock photos feels manipulative and tone-deaf.
2. **Abstract visuals only.** Gradients, geometric shapes, soft orbs, light effects.
3. **User-uploaded photos** are the only human images in the entire product.
4. **Avatar placeholders** use a subtle silhouette icon or the first letter of the name in a gradient circle.

---

## 9. Emotional Design Patterns

These are specialized design patterns that exist because of the emotional nature of this product.

### 9.1 The "Gentle Loading" Pattern
Instead of a generic spinner, show empathetic copy during loading states:
- Memory ingestion: *"Understanding [Name]'s story..."*
- Chat response: *"[Name] is thinking..."*
- Avatar creation: *"Building [Name]'s presence..."*

### 9.2 The "Graceful Empty" Pattern
When there's no data yet, never show a blank screen. Show a warm invitation:
- Empty chat: *"Begin a conversation with [Name]. They remember what you've shared."*
- No memories: *"Share your first memory of [Name]. Even a single sentence is a start."*
- No companions: *"When you're ready, create your first companion."*

### 9.3 The "Soft Exit" Pattern
When the user has been chatting for a long time (>30 minutes or >50 messages), subtly show:
- A gentle message: *"It's been a while. Would you like to take a break? [Name] will be here whenever you're ready."*
- A visible "End Session" button that wasn't prominent before.
- Links to therapy resources (BetterHelp, Amaha).

### 9.4 The "Memory Contributed" Pattern
When the AI doesn't know something and the user shares new information:
- Show a small toast: *"✨ Thank you. This memory has been saved."*
- The toast uses `--gradient-warm` (violet→gold) to feel rewarding.
- The memory count in the sidebar increments with a `scalePop` animation.

---

## 10. Current Problems & Fixes

An honest assessment of the current frontend code and what needs to change.

| Problem | Where | Fix |
|:---|:---|:---|
| **Emoji icons look cheap** | Feature cards, sidebar, chat header | Replace with proper SVG icons (Lucide) or styled Unicode in gradient circles |
| **No scroll-based navbar transition** | Landing page navbar | Add `IntersectionObserver` to toggle `.navbar-scrolled` class with glass background |
| **Auth pages are basic forms** | `/auth/login`, `/auth/signup` | Implement split-screen layout with decorative gradient panel |
| **Onboarding feels like a generic form wizard** | `/onboarding` | Add step-transition animations, warm copy, guided prompts |
| **Chat sidebar uses plain emoji for avatars** | Chat sidebar | Replace with circular avatar thumbnail (user-uploaded photo or initial-letter gradient) |
| **No staggered animations** | Feature cards, chat messages | Add `animation-delay` based on element index |
| **Feature cards have no hover effect** | Landing page | Add `translateY(-4px)` + `--shadow-md` on hover |
| **No empty states** | Chat, memories list | Add empathetic placeholder content per Section 9.2 |
| **No responsive breakpoints implemented** | All pages | Add `@media` queries per Section 7 |
| **"Typing..." indicator is plain text** | Chat page | Replace with animated pulsing dots |
| **No loading states during async ops** | Onboarding uploads, chat sends | Add skeleton loaders and contextual loading copy |
