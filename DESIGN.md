# Design Contracts — DESIGN.md

Canonical product design system for **designcontracts.sh**.  
All UI work must follow this document. Outdated notes in `DESIGN_SYSTEM.md` are superseded here.

---

## Product surface

Design Contracts is an **app**, not a marketing site.

| Principle | Rule |
|-----------|------|
| Chat first | `/` is the chat workspace. Scanning happens in-chat. |
| App chrome | Persistent left sidebar + main canvas. **No marketing footer** on product routes. |
| One job | Each view has one purpose. Don’t stack hero + stats + promos on product pages. |
| Quiet density | Linear / Raycast-like: hairline borders, soft surfaces, high contrast type — not purple glow or card soup. |

### Product routes (use `AppShell`)

| Route | Nav label | Purpose |
|-------|-----------|---------|
| `/` | Chat | Primary scan chat |
| `/community` | Library | Scanned Design Contracts directory |
| `/docs` | Docs | API + install guidance |
| `/site/[domain]` | *(detail)* | Full contract for one domain — **hydrate from cache, never auto-rescan** |

### Legacy redirects

| From | To |
|------|----|
| `/scan`, `/agent` | `/` (preserve `?url=`) |
| `/community/[domain]` | `/site/[domain]` |

Secondary pages (`/about`, `/pricing`, `/features`, legal) may use lighter chrome but should share tokens, type, and link back into the app shell (`/` / Library / Docs).

---

## Visual language

Inspired by modern AI workspaces (sidebar + canvas, ⌘K density, soft panels) adapted for Design Contracts.

### Theme

- **Default:** dark-first (`:root` = dark). Light mode is supported via `.light`.
- **Accent:** cool mint (`oklch` hue ~185) — used sparingly for `.sh`, focus rings, active pills. **No purple glow.**
- **Surfaces:** near-black canvas → slightly lifted sidebar → card panels. Depth from tone shifts + 1px borders, not multi-layer shadows.

### Tokens (CSS)

Defined in `app/globals.css`:

| Token | Role |
|-------|------|
| `--background` | App canvas |
| `--sidebar` | Sidebar rail |
| `--card` | Panels / composer / list rows |
| `--foreground` / `--muted-foreground` | Primary / secondary type |
| `--accent` | Mint accent surface |
| `--soft-border` | Hairline separators |
| `--radius` | Base radius (`0.75rem`); use `rounded-xl` / `rounded-2xl` for panels |

### Typography

| Role | Font | Notes |
|------|------|-------|
| Brand wordmark | Instrument Serif (`font-serif`) | `designcontracts` + mono `.sh` |
| UI / body | Geist Sans | 14–15px body, clear hierarchy |
| Meta / commands | Geist Mono | 10–12px uppercase tracking for labels; install cmds |

Avoid Inter/Roboto/Arial as primary UI fonts.

### Shape & spacing

- Panels / composer: `rounded-2xl`, thin border `border-[color:var(--soft-border)]`
- Sidebar items: `rounded-lg`, active = `bg-sidebar-accent` or soft secondary fill
- Padding: generous in main canvas; tighter in sidebar
- **No cards in empty-state hero.** Cards only for interactive units (contract strip, library row)

### Motion

Keep to 2–3 intentional motions:

1. Empty-state fade/slide-in
2. Message appear (`animate-slide-in`)
3. Composer focus / submit feedback

No decorative pulse/glow loops on idle chrome.

### Icons

Lucide outline icons, 16–18px, consistent stroke. No emoji in chrome.

---

## App shell

### Sidebar

```
┌─────────────────┐
│ designcontracts.sh │
│                 │
│ + New chat      │
│ ○ Chat          │  ← active on /
│ ○ Library       │  ← /community
│ ○ Docs          │  ← /docs
│                 │
│ Recents         │
│   stripe.com    │
│   linear.app    │
│                 │
│ [theme]         │
└─────────────────┘
```

- Width ~240px desktop; sheet/drawer on mobile
- Recents from local history of opened/scanned domains → `/site/[domain]` or `/?url=`
- Brand links to `/`

### Main canvas

- Full remaining viewport height (`h-dvh`), `overflow-hidden` for chat
- Chat: message column `max-w-2xl` centered; composer docked bottom with top fade
- Library/Docs: scrollable main with page title + one supporting line

### Chat empty state

1. Brand wordmark (hero-level)
2. One short line: “Paste a URL. Get an installable Design Contract.”
3. Quiet domain chips (stripe.com, …)
4. Composer docked below — not a marketing form

### Inline contract widget

Compact horizontal strip (screenshot thumb optional + domain + swatches + Open).  
Not a full marketing card. Open → `/site/[domain]` **without rescanning**.

---

## Component rules

| Do | Don’t |
|----|-------|
| Use `AppShell` on product routes | Add `MarketingFooter` on Chat/Library/Docs/Site |
| Use semantic tokens (`bg-background`, `text-muted-foreground`) | Hard-code purple/indigo gradients |
| Prefer list rows / strips for results | Nest cards inside cards |
| One primary CTA per section | Pill clusters / stat strips in first viewport |
| Hydrate site pages from `/api/sites/[domain]` | Call `startScan` when cache exists |

---

## Scanning UX (product)

1. User chats a URL → agent `get_tokens` then `scan_site` (accurate when scanner configured)
2. Widget appears inline with mode/engine badge when available
3. **Open** loads saved Blob/Redis scan — no second scan
4. Explicit “New scan” only forces a fresh accurate run

Scanner wiring (ops): `SCANNER_SERVICE_URL` + `SCANNER_SERVICE_SECRET` on the Next.js project.

---

## Checklist for new UI

- [ ] Lives inside `AppShell` if it’s a product route
- [ ] No footer; sidebar nav still works
- [ ] Uses DESIGN.md tokens/type/radius
- [ ] Active nav item matches route
- [ ] Mobile: sidebar collapses to sheet; chat remains usable
- [ ] Dark default looks correct; light mode not broken
