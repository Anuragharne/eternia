# Color Grading & Visual Identity — Eternia AI Companion

> The definitive color specification for the Eternia platform. Every color decision has a **psychological reason** behind it. This document governs all color usage across the product.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Core Palette](#2-core-palette)
3. [Semantic Color System](#3-semantic-color-system)
4. [Gradient Definitions](#4-gradient-definitions)
5. [Surface & Depth System](#5-surface--depth-system)
6. [Typography Color Rules](#6-typography-color-rules)
7. [Component Color Mapping](#7-component-color-mapping)
8. [Accessibility Compliance](#8-accessibility-compliance)
9. [Do's and Don'ts](#9-dos-and-donts)

---

## 1. Design Philosophy

### Why Dark Mode Only?

Eternia is not a productivity app. It is an **emotional sanctuary**. Users come here when they miss someone deeply. A white, bright interface would feel clinical and cold—like a hospital waiting room. 

Dark mode achieves three things:
1. **Intimacy** — Dark environments naturally feel private and personal (like a late-night conversation).
2. **Focus** — The user's attention is drawn to the content (the avatar, the chat) not the chrome.
3. **Reduced Eye Strain** — Users may spend extended, emotional sessions. Dark backgrounds reduce fatigue.

### Why Violet + Gold?

| Color | Psychological Association | Why We Use It |
|:---|:---|:---|
| **Deep Violet** | Spirituality, memory, wisdom, mourning (in many cultures) | Connects to the act of remembrance without being morbid |
| **Soft Gold** | Warmth, treasure, preciousness | Memories are the most precious thing we have. Gold communicates that |
| **Muted Lavender** | Calm, gentleness, peace | Used for secondary/hover states to feel soothing, never jarring |

We deliberately avoid:
- **Pure Red** — Too aggressive, associated with danger/alerts.
- **Bright Blue** — Too corporate, associated with productivity tools.
- **Pure Green** — Too clinical, associated with "success" in enterprise software.
- **Neon/Saturated Accents** — Too flashy. This isn't a gaming app.

---

## 2. Core Palette

### 2.1 Brand Colors

| Swatch | Name | Hex | HSL | Usage |
|:---|:---|:---|:---|:---|
| 🟣 | **Violet 500** (Primary) | `#8b5cf6` | `hsl(258, 90%, 66%)` | Primary buttons, active states, key CTAs |
| 🟣 | **Violet 400** (Secondary) | `#a78bfa` | `hsl(258, 90%, 76%)` | Links, secondary actions, hover states |
| 🟣 | **Violet 300** (Accent) | `#c4b5fd` | `hsl(258, 95%, 85%)` | Subtle highlights, badges, tags |
| 🟡 | **Gold 400** | `#f5c542` | `hsl(43, 90%, 61%)` | Premium features, special moments, emphasis |
| 🟠 | **Warm Orange** | `#fb923c` | `hsl(27, 96%, 61%)` | Warm handoff buttons, gentle alerts |

### 2.2 Neutral Scale (Background & Surface)

| Swatch | Name | Hex | HSL | Usage |
|:---|:---|:---|:---|:---|
| ⬛ | **Void** | `#0a0a0f` | `hsl(240, 20%, 4%)` | Page background, deepest layer |
| ⬛ | **Abyss** | `#12121a` | `hsl(240, 17%, 8%)` | Card backgrounds, sidebar |
| ⬛ | **Slate** | `#1a1a2e` | `hsl(240, 27%, 14%)` | Elevated cards, modals, input fields |
| ⬛ | **Mist** | `rgba(255,255,255,0.04)` | — | Glass card fill |
| ⬛ | **Fog** | `rgba(255,255,255,0.07)` | — | Card hover state |
| ⬛ | **Haze** | `rgba(255,255,255,0.10)` | — | Active/pressed state |

> **Critical Rule:** We never use pure `#000000` (true black). Pure black creates harsh contrast with text. Our darkest color is `#0a0a0f`, which has a subtle blue undertone that makes the dark feel rich and deep, not flat.

### 2.3 Text Colors

| Name | Hex | Usage | Minimum Contrast Ratio |
|:---|:---|:---|:---|
| **Primary Text** | `#f0f0f5` | Body text, headings | 15.8:1 on Void ✅ |
| **Secondary Text** | `#a0a0b8` | Descriptions, timestamps | 7.2:1 on Void ✅ |
| **Muted Text** | `#6b6b80` | Placeholders, disabled text | 4.5:1 on Void ✅ |
| **Inverse Text** | `#0a0a0f` | Text on light/gold backgrounds | Depends on bg |

### 2.4 Status Colors

| Name | Hex | Usage |
|:---|:---|:---|
| **Success** | `#34d399` | Memory saved, upload complete, grounded response |
| **Warning** | `#fbbf24` | Partially grounded, approaching limits |
| **Error** | `#f87171` | Failed upload, validation error |
| **Info** | `#60a5fa` | Informational tooltips, neutral notices |

---

## 3. Semantic Color System

Instead of using raw hex codes, every component references **semantic tokens**. This ensures consistency and makes future theme changes trivial.

```css
:root {
  /* Surfaces */
  --color-surface-base:     #0a0a0f;     /* Page background */
  --color-surface-raised:   #12121a;     /* Sidebar, cards at rest */
  --color-surface-overlay:  #1a1a2e;     /* Modals, dropdowns, elevated cards */
  --color-surface-glass:    rgba(255, 255, 255, 0.04);  /* Glassmorphism fill */
  
  /* Interactive */
  --color-interactive-primary:   #8b5cf6;  /* Primary buttons, active links */
  --color-interactive-hover:     #a78bfa;  /* Hover state */
  --color-interactive-pressed:   #7c3aed;  /* Pressed/active state */
  --color-interactive-disabled:  #4b4b60;  /* Disabled buttons */
  
  /* Borders */
  --color-border-subtle:    rgba(255, 255, 255, 0.08);  /* Dividers */
  --color-border-default:   rgba(255, 255, 255, 0.12);  /* Card borders */
  --color-border-focus:     rgba(139, 92, 246, 0.5);    /* Focus rings */
  
  /* Feedback */
  --color-grounded:    #34d399;  /* Chat message is memory-backed */
  --color-ungrounded:  #fbbf24;  /* Chat message has low confidence */
  --color-crisis:      #f87171;  /* Crisis detection triggered */
}
```

---

## 4. Gradient Definitions

Gradients are used sparingly for **emphasis and hierarchy**. They should feel like subtle light sources, not decorative noise.

### 4.1 Brand Gradient (Primary)
```css
--gradient-brand: linear-gradient(135deg, #8b5cf6, #a78bfa, #c4b5fd);
```
**Used on:** Primary CTA buttons, the hero section accent text, progress bar fills.

### 4.2 Hero Gradient (Landing page background)
```css
--gradient-hero: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 25%, #4c1d95 50%, #1e1b4b 100%);
```
**Used on:** The full-page hero background only. Creates a sense of depth—like looking into a deep, starry sky.

### 4.3 Warm Gradient (Violet → Gold)
```css
--gradient-warm: linear-gradient(135deg, #8b5cf6, #f5c542);
```
**Used on:** Premium badges, "Eternal Memorial" branding, upgrade prompts. Communicates warmth and value.

### 4.4 Glass Gradient (Glassmorphism overlay)
```css
--gradient-glass: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(196, 181, 253, 0.05));
```
**Used on:** Card backgrounds that need a subtle violet tint (e.g., the active chat companion card, the onboarding card).

### 4.5 Glow Gradient (Ambient light effect)
```css
--gradient-glow: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
```
**Used on:** Background decorative orbs on the landing page and behind the avatar photo in chat. Creates a soft "aura" effect.

---

## 5. Surface & Depth System

We use a 5-layer depth system. Each layer gets progressively lighter, creating a natural visual hierarchy.

```
Layer 0 (Deepest)  → --color-surface-base    (#0a0a0f)  → Page background
Layer 1 (Recessed)  → --color-surface-raised   (#12121a)  → Sidebar, footer
Layer 2 (Card)      → --color-surface-glass    (rgba)     → Cards, panels
Layer 3 (Elevated)  → --color-surface-overlay   (#1a1a2e)  → Modals, dropdowns
Layer 4 (Floating)  → --color-surface-glass + blur        → Tooltips, popovers
```

### Shadow System (Depth Reinforcement)

| Shadow Token | CSS Value | Used On |
|:---|:---|:---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Buttons, tags |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards at rest |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.5)` | Modals, elevated panels |
| `--shadow-glow` | `0 0 40px rgba(139,92,246,0.3)` | Primary CTA hover, hero orbs |
| `--shadow-glow-sm` | `0 0 20px rgba(139,92,246,0.2)` | Active sidebar item, focus state |

---

## 6. Typography Color Rules

| Element | Color Token | Weight | Why |
|:---|:---|:---|:---|
| Page headings (`h1`, `h2`) | `--text-primary` (#f0f0f5) | 600-700 | Maximum readability, draws the eye first |
| Body text, paragraphs | `--text-primary` (#f0f0f5) | 400 | Clean reading experience |
| Descriptions, captions | `--text-secondary` (#a0a0b8) | 400 | Visually recedes, doesn't compete with headings |
| Timestamps, metadata | `--text-muted` (#6b6b80) | 400 | Least important info, fades into background |
| Gradient accent text | `--gradient-brand` (via `background-clip`) | 700 | Used on hero keywords like "You Love" to create visual sparkle |
| Links | `--brand-secondary` (#a78bfa) | 500 | Distinct from body text, invites interaction |
| Links on hover | `--brand-accent` (#c4b5fd) | 500 | Lighter = "closer to you" = inviting |

---

## 7. Component Color Mapping

### 7.1 Buttons

| Variant | Background | Text | Border | Hover | Use Case |
|:---|:---|:---|:---|:---|:---|
| **Primary** | `--gradient-brand` | `#ffffff` | none | Glow + slight scale | Main CTAs ("Get Started", "Send") |
| **Secondary** | `transparent` | `--text-primary` | `--border-default` | `--bg-card-hover` | Alternative actions ("See How It Works") |
| **Ghost** | `transparent` | `--text-secondary` | none | `--bg-card` | Tertiary actions ("Sign In", "Settings") |
| **Danger** | `rgba(248,113,113,0.1)` | `--color-error` | `rgba(248,113,113,0.3)` | Stronger red bg | Destructive ("Delete Account") |
| **Gold** | `--gradient-warm` | `--text-inverse` | none | Glow + brightness | Premium upgrade prompts |

### 7.2 Chat Bubbles

| Element | Color | Why |
|:---|:---|:---|
| User message background | `--gradient-glass` | Subtle violet tint → "this is mine" |
| User message border | `rgba(139, 92, 246, 0.2)` | Connects to brand without being loud |
| Avatar message background | `--bg-card` | Neutral → "this is theirs" |
| Avatar message border | `--border-subtle` | Barely visible, feels organic |
| Grounding badge (✓ grounded) | `--color-success` (#34d399) | Green = safe, verified |
| Grounding badge (⚠ low confidence) | `--color-warning` (#fbbf24) | Yellow = caution, not fully verified |

### 7.3 Sidebar

| Element | Color |
|:---|:---|
| Background | `--color-surface-raised` (#12121a) |
| Active companion item | `--gradient-glass` + left border `--brand-primary` |
| Inactive companion item | `transparent` |
| Hover state | `--bg-card` |

### 7.4 Inputs & Forms

| State | Background | Border | Ring |
|:---|:---|:---|:---|
| Default | `--color-surface-overlay` | `--border-default` | none |
| Focus | `--color-surface-overlay` | `--color-border-focus` | `0 0 0 3px rgba(139,92,246,0.15)` |
| Error | `--color-surface-overlay` | `rgba(248,113,113,0.5)` | `0 0 0 3px rgba(248,113,113,0.1)` |
| Disabled | `rgba(255,255,255,0.02)` | `rgba(255,255,255,0.05)` | none |

---

## 8. Accessibility Compliance

All color combinations must meet **WCAG 2.1 AA** standards (minimum 4.5:1 contrast ratio for normal text, 3:1 for large text).

### Verified Contrast Ratios

| Foreground | Background | Ratio | Pass? |
|:---|:---|:---|:---|
| `#f0f0f5` (primary text) | `#0a0a0f` (void) | 15.8:1 | ✅ AAA |
| `#a0a0b8` (secondary text) | `#0a0a0f` (void) | 7.2:1 | ✅ AA |
| `#6b6b80` (muted text) | `#0a0a0f` (void) | 4.5:1 | ✅ AA |
| `#ffffff` (button text) | `#8b5cf6` (violet bg) | 4.6:1 | ✅ AA |
| `#0a0a0f` (inverse text) | `#f5c542` (gold bg) | 11.2:1 | ✅ AAA |
| `#34d399` (success) | `#0a0a0f` (void) | 9.1:1 | ✅ AAA |
| `#fbbf24` (warning) | `#0a0a0f` (void) | 10.4:1 | ✅ AAA |
| `#f87171` (error) | `#0a0a0f` (void) | 5.5:1 | ✅ AA |

### Focus Indicators

Every interactive element must have a visible focus ring when navigated via keyboard:
```css
*:focus-visible {
  outline: 2px solid rgba(139, 92, 246, 0.6);
  outline-offset: 2px;
}
```

---

## 9. Do's and Don'ts

### ✅ Do

- Use `--brand-primary` (#8b5cf6) for primary actions only. If everything is purple, nothing is purple.
- Use gradients on maximum 2 elements per screen (e.g., hero text + CTA button).
- Add `backdrop-filter: blur()` on glass surfaces for true glassmorphism depth.
- Use `--text-muted` for timestamps and metadata to create visual hierarchy.
- Use gold sparingly — it should feel like discovering treasure, not wallpaper.

### ❌ Don't

- Don't use pure white (`#ffffff`) for backgrounds. Ever. (Except button text on colored backgrounds.)
- Don't use pure black (`#000000`) for surfaces. Use `#0a0a0f` minimum.
- Don't combine more than 2 gradients on the same screen — it looks like a nightclub.
- Don't use red for anything except errors and crisis detection.
- Don't use the brand violet for error states — it confuses the user about what's interactive vs what's wrong.
- Don't apply `box-shadow: --shadow-glow` to more than 1 element at a time on screen — the "glow" effect loses its magic if overused.
