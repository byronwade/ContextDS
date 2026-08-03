# Design Contracts — DESIGN.md

Canonical product design system for **designcontracts.sh**.  
**Editorial Cream Workbench** — warm cream canvas, warm near-black ink, Cursor Orange accent, hairline-only depth.

All UI work must follow this document. `DESIGN_SYSTEM.md` is legacy.

---

## Product surface

Design Contracts is an **app workbench**, not a brochure site.

| Principle | Rule |
|-----------|------|
| Chat first | `/` is the centered action canvas. Scanning happens in-chat. |
| App chrome | Cream canvas + 240px sidebar + **inset white workspace** (hairline border). No marketing footer. |
| Warm canvas | Outer `#f7f7f4`; cards/workspace `#ffffff`. Never pure-white page floor. |
| Single accent | Cursor Orange `#f54e00` — scarce primary actions + `.sh` wordmark. |
| Hairline depth | No drop shadows. Cards float via 1px hairlines + white-on-cream contrast. |
| Magazine voice | Display weight stays at **400**. Negative letter-spacing on display only. |
| Dense ops | Compress lists/queues; relax nav and empty states. |

### Product routes (use `AppShell`)

| Route | Nav | Archetype |
|-------|-----|-----------|
| `/` | Chat | Centered action canvas (712px) |
| `/community` | Library | Full operational canvas (dense list) |
| `/docs` | Docs | Document (~760px) |
| `/site/[domain]` | detail | Document + optional modules |
| `/features` `/pricing` `/about` | More | Document |
| `/contact` `/privacy` `/terms` | Legal | Document / settings |

---

## Shell geometry

```
Outer cream canvas (`#f7f7f4` / dark `#161612`)
├── Global sidebar: 240px (on canvas)
│   └── Full-width theme segment (Light / Auto / Dark)
└── Inset workspace: 8px margin on **all sides**, 12px radius white paper + 1px edge hairline
    ├── Utility strip inside paper: quiet live stats (36px)
    └── Task body (chat / list / document) — same sheet on home and every AppShell route
```

Rules:
- Stats strip + body + composer = **one paper sheet** (no chrome outside the sheet on desktop).
- Home chat uses the same paper inset as docs/library — never flush the sheet to the sidebar.
- Chat composer: compact dock (`max-w` 712px), edge border, subtle footer toolbar, grows with content.
- Prefer `--ui-border-soft` for internal dividers; `--ui-border` for card outlines; `--ui-border-edge` for stronger panel outlines / secondary buttons.
- Theme defaults to **light**; FOUC script + `html.light` enforce it.
- Keep uppercase/mono labels scarce — prefer calm sentence-case chrome.

---

## Colors

Defined in `app/globals.css` as `--ui-*` and mapped to shadcn semantics.

### Brand & surfaces

| Token | Value | Role |
|-------|-------|------|
| `--ui-canvas` | `#f7f7f4` | Outer app canvas (warm cream) |
| `--ui-paper` | `#ffffff` | Workspace / cards |
| `--ui-paper-subtle` | `#fafaf7` | IDE pane / toolbar tint |
| `--ui-paper-hover` | `#f0efe9` | Hover fill |
| `--ui-paper-selected` | `#e6e5e0` | Selected nav / badges |
| `--ui-ink` | `#26251e` | Display, body emphasis |
| `--ui-ink-secondary` | `#5a5852` | Default running text |
| `--ui-ink-muted` | `#807d72` | Sub-titles / captions |
| `--ui-ink-muted-soft` | `#a09c92` | Disabled text |
| `--ui-accent` | `#f54e00` | Primary CTA (scarce) |
| `--ui-accent-hover` | `#d04200` | Pressed CTA |
| `--ui-accent-soft` | `rgba(245,78,0,0.1)` | Soft accent wash |
| `--ui-on-primary` | `#ffffff` | Text on orange |
| `--ui-border-soft` | `#efeee8` | Internal dividers |
| `--ui-border` | `#e6e5e0` | Card outlines |
| `--ui-border-edge` | `#cfcdc4` | Stronger panel / secondary btn |

### Timeline (AI-action signature — product UI only)

| Token | Value | Stage |
|-------|-------|-------|
| `--timeline-thinking` | `#dfa88f` | Thinking |
| `--timeline-grep` | `#9fc9a2` | Grepping |
| `--timeline-read` | `#9fbbe0` | Reading |
| `--timeline-edit` | `#c0a8dd` | Editing |
| `--timeline-done` | `#c08532` | Done |

Never use timeline pastels as system action colors.

### Semantic

| Token | Value |
|-------|-------|
| `--ui-success` | `#1f8a65` |
| `--ui-danger` | `#cf2d56` |

Dark mode is optional (warm dark ink canvas). Light cream is the brand default.

---

## Elevation & depth

**Hairline-only.** No drop shadows, no elevation tiers.

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (canvas) | `--ui-canvas` | Body bands, sidebar, footer |
| Card | `--ui-paper` + 1px `--ui-border` | Content cards, inset workspace |
| IDE pane | `--ui-paper-subtle` | Inside IDE mockup cards |

`--shadow-*` tokens exist for compatibility but resolve to `none`.

---

## Typography

| Role | Spec |
|------|------|
| UI / body | Inter (`--font-ui`) — open-source substitute for CursorGothic |
| Display | Inter 400, negative tracking (`text-display-*` / `.font-serif`) |
| Section titles | 22–36px weight 400 |
| Component titles | 16–18px weight 600 |
| Code / domains | JetBrains Mono 13px |
| Caption uppercase | 11px / 600 / 0.88px tracking |
| Button labels | 14px / 500 |
| Counts / dates | Tabular numerals |

### Display scale

| Class | Size | Weight | Tracking |
|-------|------|--------|----------|
| `.text-display-mega` | 72px (56 tablet / 32 mobile) | 400 | −2.16px |
| `.text-display-lg` | 36px | 400 | −0.72px |
| `.text-display-md` | 26px | 400 | −0.325px |
| `.text-display-sm` | 22px | 400 | −0.11px |

Icons are **Phosphor duotone** (`@phosphor-icons/react`): product surfaces inherit
`weight="duotone"` from the AppShell `IconContext`; surfaces outside the shell import
from `lib/phosphor.tsx`. No lucide in new UI.

---

## Shapes

| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 4px | Inline tags |
| `--radius-sm` | 6px | Compact rows |
| `--radius-md` | 8px | CTA buttons, inputs |
| `--radius-paper` / `--radius-shell` | 12px | Cards, IDE panes, workspace |
| `--radius-xl` | 16px | Larger feature cards (rare) |
| `--radius-full` | 9999px | Timeline pills, badges |

---

## Spacing

Base unit **4px**. Section rhythm **80px** (`--space-section`).

| Token | Value |
|-------|-------|
| `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 20 / 24 / 32 |
| `--space-12` | 48px |
| `--space-section` | 80px |

Max content width ~1200px. Editorial body / docs ~760px. Chat action column 712px.

---

## Controls

| Size | Height | Use |
|------|--------|-----|
| Compact | 28–32px | Icon buttons, dense chrome |
| Default CTA | 40px | Primary / secondary pills (`rounded.md` 8px) |
| Download / input | 44px | Emphasis CTAs, text inputs |

Flat fills + hairline borders. At most one orange primary action per local region.

Button variants: `default` (orange), `secondary`/`outline` (white + hairline), `download` (ink on cream), `ghost`, `link`.

---

## Layout archetypes

Use `PageCanvas` variants: `action` | `document` | `settings` | `operational`.

- **Chat**: centered 712px stack; composer pinned as integrated footer tint.
- **Library**: full-width dense rows — `status | identity | title | flex | meta | actions`.
- **Docs / More**: unboxed long-form; box only stateful modules (API endpoints, code).

---

## Component rules

| Do | Don’t |
|----|-------|
| `AppShell` + inset white paper | Marketing header/footer forks |
| `--ui-*` / semantic tokens | Cool blue-gray outlines, pure-white canvas |
| One Cursor Orange primary | Secondary brand action colors, purple gradients, glow |
| Display weight 400 | Bold (700+) display headlines |
| Hairline borders only | Drop shadows / nested elevation |
| JetBrains Mono on code | Sans on code surfaces |
| Timeline pastels in agent UI only | Pastels as success/error/CTA |
| Hydrate `/site` from cache/handoff | Auto-rescan on Open |

---

## Scanning UX

1. Chat URL → tools → inline contract widget  
2. **Open** stashes handoff + hydrates Blob  
3. Never auto-rescan; empty state offers Scan now  
4. Redis stats strip ticks live (optimistic bumps + 4s poll)

---

## Checklist for new UI

- [ ] Outer canvas `#f7f7f4`, paper `#ffffff`
- [ ] Inset workspace reads as one hairline sheet
- [ ] Controls 40/44px CTAs with 8px radius; no bevel shadows
- [ ] At most one Cursor Orange CTA in view
- [ ] Display weight 400 (magazine voice)
- [ ] Code surfaces use JetBrains Mono
- [ ] Archetype chosen (action / document / operational)
- [ ] No drop shadows / nested card stacks
- [ ] Mobile drawer + touch targets OK
- [ ] Light default correct; dark optional
