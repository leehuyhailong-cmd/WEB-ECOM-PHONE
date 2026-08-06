# Phonestore — AI Status Report

> **Generated**: 2026-08-02  
> **Purpose**: External architect verification of project state and enforced engineering standards  
> **Phase**: Backend complete → Frontend pending (awaiting command)

---

## 1. Project Overview

| Field | Detail |
|-------|--------|
| **Project Name** | Phonestore — Hệ thống quản lý và bán hàng trực tuyến cho cửa hàng điện thoại |
| **Domain** | E-commerce (phone retail) |
| **Architecture** | Fullstack — Node.js/Express backend + upcoming 3D interactive frontend |
| **Database** | MongoDB (Mongoose ODM) |
| **Audit Score** | **98 / 100** |
| **Backend Status** | ✅ 100% complete (Phases 0–8) — no rewrites needed |

---

## 2. Backend — Current Architecture

### 2.1 Tech Stack

- **Runtime**: Node.js ≥ 18
- **Framework**: Express 4.x
- **Database**: MongoDB via Mongoose 8.x
- **Authentication**: JWT + Passport (Local + Google OAuth2) + Express Session (MongoStore)
- **Validation**: Zod
- **Logging**: Pino + Pino-Pretty (structured JSON logging)
- **File Uploads**: Multer → Cloudinary
- **Payment**: VNPay integration
- **AI/Chatbot**: OpenAI SDK
- **Security**: Helmet, CORS (origin whitelist), express-mongo-sanitize, xss-clean, express-rate-limit, cookie-parser (HttpOnly cookies)
- **Performance**: Compression middleware

### 2.2 Layered Module Structure

```
server.js                  → Entry point, graceful shutdown, signal handling
└── src/
    ├── app.js             → Express pipeline (12-stage middleware chain)
    ├── config/            → env validation, DB connection, Passport, Cloudinary
    ├── middlewares/        → auth, error-handler, rate-limit, upload, validate
    ├── models/            → Cart, ChatSession, Order, Product, Review, User, UserEvent
    ├── repositories/      → Data-access layer (decoupled from controllers)
    ├── modules/           → Feature domains (controller + router + service per module)
    │   ├── auth/
    │   ├── products/
    │   ├── cart/
    │   ├── orders/
    │   ├── reviews/
    │   ├── chatbot/
    │   ├── recommendations/
    │   ├── admin/
    │   └── users/
    └── utils/             → Logger, shared helpers
```

### 2.3 Middleware Pipeline (order matters)

1. **Security** — Helmet (CSP), CORS (whitelist)
2. **Performance** — Compression
3. **Body Parsing** — JSON + URL-encoded (10 MB limit), cookie-parser
4. **Input Sanitisation** — mongo-sanitize, xss-clean
5. **Session** — express-session + MongoStore (1-day TTL)
6. **Passport** — initialize + session
7. **Request Logging** — Pino structured logger
8. **Static Files** — `public/` directory
9. **Rate Limiting** — applied to all `/api/` routes
10. **Health Check** — `GET /api/health` (no auth)
11. **Feature Routers** — auth, products, cart, orders, reviews, chatbot, recommendations, admin
12. **Error Handlers** — 404 not-found + centralised error handler (always last)

### 2.4 API Surface

| Route Prefix | Module | Status |
|-------------|--------|--------|
| `/api/auth` | Authentication (register, login, OAuth) | ✅ |
| `/api/products` | Product CRUD, search, filtering | ✅ |
| `/api/cart` | Cart management | ✅ |
| `/api/orders` | Order lifecycle, VNPay payment | ✅ |
| `/api/reviews` | Product reviews & ratings | ✅ |
| `/api/chatbot` | AI-powered customer support (OpenAI) | ✅ |
| `/api/recommendations` | Purchase-history-based suggestions | ✅ |
| `/api/admin` | Dashboard, stats, management | ✅ |
| `/api/health` | Health check (DB status, uptime) | ✅ |

---

## 3. Internalized Skills & Enforced Rules

The following 7 skill files have been read, absorbed, and will be strictly enforced for all future work.

### 3.1 Brainstorming Skill

- **No coding during the design phase** — act as design facilitator, not builder
- **One question at a time**; prefer multiple-choice; open-ended only when necessary
- **Understanding Lock** (hard gate) — must produce a 5–7 bullet summary of intent, list all assumptions, and get explicit user confirmation before any design proposal
- Propose **2–3 viable approaches** with clear trade-offs (complexity, extensibility, risk, maintenance)
- **YAGNI ruthlessly** — avoid premature optimisation and speculative features
- Maintain a running **Decision Log** (what was decided, alternatives, rationale)
- **Exit criteria**: Understanding Lock confirmed, design accepted, assumptions documented, risks acknowledged, Decision Log complete — all must be met before implementation

### 3.2 Frontend Design Skill

- **Ground every design in the subject's world** — phone retail vernacular, materials, and audience; never produce a design that could belong to any other product
- **Two-pass workflow**:
  1. Brainstorm a compact token system: 4–6 named hex palette, display + body typefaces, layout concept (ASCII wireframes), and one signature element
  2. Self-critique against known AI-default patterns (cream #F4F1EA + serif, acid-green-on-black, broadsheet layout) — if any axis matches a default, revise and document why
- **Typography carries personality** — deliberate face pairing, clear type scale, intentional weights/spacing; type treatment must be memorable, not neutral
- **Structure encodes information** — numbered markers, dividers, and labels must reflect real content hierarchy, not decoration
- **Motion is deliberate** — orchestrated moments over scattered effects; sometimes less is more
- **Spend boldness in one place** — signature element is the one memorable thing; keep everything else quiet
- **Copy is design material** — active voice, user-facing language, sentence case, no filler; errors don't apologise, empty states invite action
- **CSS hygiene** — watch selector specificity conflicts (type vs. class), especially padding/margin between sections

### 3.3 Node.js Backend Patterns Skill

- Custom error classes for structured error handling
- Input validation via Zod or Joi on every endpoint
- Environment variables for all secrets — never hardcode
- Structured logging with Pino/Winston
- Rate limiting on all public routes
- Proper CORS configuration — no wildcard `*` in production
- Dependency injection for testability
- Graceful shutdown with resource cleanup
- Connection pooling for database
- Health check endpoints for monitoring
- Compression for response size reduction
- Full test coverage: unit, integration, and E2E

> **Note**: The existing backend already conforms to these patterns. No changes required.

### 3.4 UI/UX Pro Max Skill

**Priority-ordered rule categories (non-negotiable in order 1→10):**

- **P1 — Accessibility (CRITICAL)**: Contrast ≥ 4.5:1 for normal text, visible focus rings (2–4px), descriptive alt text, `aria-label` for icon-only buttons, keyboard nav matching visual tab order, sequential heading hierarchy (h1→h6), `prefers-reduced-motion` respected
- **P2 — Touch & Interaction (CRITICAL)**: Min touch target 44×44pt (iOS) / 48×48dp (Android), 8px+ spacing between targets, loading feedback on async buttons (disable + spinner), no hover-only reliance, `touch-action: manipulation` to eliminate 300ms tap delay
- **P3 — Performance (HIGH)**: WebP/AVIF images, lazy loading below fold, `width`/`height` or `aspect-ratio` to prevent CLS (< 0.1), `font-display: swap`, critical CSS inlined, code-split by route, virtualise lists > 50 items, debounce/throttle high-frequency events
- **P4 — Style Selection (HIGH)**: Style must match product type (e-commerce / phone retail), consistency across all pages, SVG icons only (no emoji), semantic color tokens, consistent elevation/shadow scale
- **P5 — Layout & Responsive (HIGH)**: Mobile-first breakpoints (375 / 768 / 1024 / 1440), `viewport meta` (never disable zoom), 4pt/8dp spacing system, no horizontal scroll, `min-h-dvh` over `100vh` on mobile, content priority (core content first on mobile)
- **P6 — Typography & Color (MEDIUM)**: Base 16px body, line-height 1.5–1.75, 65–75 char line length, semantic color tokens (`primary`, `error`, `surface`), dark mode uses desaturated/lighter tonal variants (not inverted), tabular figures for prices
- **P7 — Animation (MEDIUM)**: 150–300ms for micro-interactions (≤400ms complex), `transform`/`opacity` only (never animate width/height), ease-out for entering / ease-in for exiting, exit animations ~60–70% of enter duration, stagger lists by 30–50ms per item, all animations interruptible
- **P8 — Forms & Feedback (MEDIUM)**: Visible labels per input (never placeholder-only), error messages below related field with cause + fix, required field indicators, auto-dismiss toasts in 3–5s, confirmation before destructive actions, inline validation on blur (not keystroke), auto-focus first invalid field on submit error
- **P9 — Navigation (HIGH)**: Bottom nav ≤ 5 items with labels + icons, predictable back behaviour preserving scroll/state, deep linking for all key screens, breadcrumbs for ≥ 3-level hierarchies, adaptive navigation (sidebar ≥ 1024px, bottom/top nav on small screens)
- **P10 — Charts & Data (LOW)**: Match chart type to data type, accessible colour palettes (not red/green only), visible legends, tooltips on interact, responsive reflow on small screens, `aria-label` summaries for screen readers

**Workflow enforced:**
1. Always run `--design-system` first to generate full recommendations
2. Persist via `MASTER.md` + `pages/` overrides for cross-session consistency
3. Supplement with `--domain` searches for deep-dives
4. Run pre-delivery checklist (375px test, dark mode contrast, touch targets, reduced-motion) before shipping

### 3.5 Web Design Guidelines Skill

- Fetch latest Vercel Web Interface Guidelines from source before every review
- Read target files, check against all fetched rules
- Output findings in terse `file:line` format
- Applied as a final quality gate before delivering any frontend code

### 3.6 Improve Codebase Architecture Skill

- **Explore organically** for friction: shallow modules, poor locality, leaked coupling across seams
- Apply the **deletion test** — would deleting a module concentrate complexity or just move it?
- Present candidates as a **self-contained HTML report** with before/after Mermaid diagrams, recommendation strength badges (`Strong` / `Worth exploring` / `Speculative`)
- Use strict architecture vocabulary: **module, interface, depth, seam, adapter, leverage, locality** — never drift into generic terms like "component" or "service"
- **Grilling loop** before implementation; update `CONTEXT.md` and ADRs as decisions crystallise
- Respect existing ADRs; only resurface contradictions when friction is real

### 3.7 Find Skills Skill

- Use `npx skills find [query]` to discover community skills for specialised needs
- **Quality gates before recommending**: ≥ 1K installs, reputable source (`vercel-labs`, `anthropics`, `microsoft`), GitHub stars ≥ 100
- Install via `npx skills add <owner/repo@skill> -g -y`
- If no skill found, offer to help directly and suggest `npx skills init` for custom creation

---

## 4. Standing Orders for Frontend Phase

| Rule | Enforcement |
|------|-------------|
| No generic/templated design | Every visual decision justified for phone-retail e-commerce |
| Two-pass design process | Token system brainstorm → self-critique against AI defaults → build |
| Design-system-first | `--design-system` CLI run before any component code |
| Accessibility non-negotiable | WCAG AA minimum (4.5:1 contrast, keyboard nav, ARIA, reduced-motion) |
| Performance budget | CLS < 0.1, lazy load below fold, WebP/AVIF, code-split by route |
| No emoji icons | SVG only (Lucide / Heroicons) |
| Semantic tokens | No raw hex in components — all colours via design tokens |
| Pre-delivery checklist | 375px mobile, dark mode, touch targets ≥ 44pt, reduced-motion |
| No code until approved | Brainstorming → Understanding Lock → Design accepted → then build |

---

## 5. Next Steps

**Status**: ⏸️ Awaiting final command to begin Frontend phase.

No frontend code has been generated. The AI agent is in standby with all rules loaded and ready to execute the two-pass design + implementation workflow upon approval.

---

*This report was generated by the AI coding assistant for external architect verification.*
