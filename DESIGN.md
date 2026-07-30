# Design Contracts — DESIGN.md

Canonical product design system for **designcontracts.sh**.  
Adapted from the Cursor marketing design language (cream canvas, single-voltage orange, hairline depth).  
All UI work must follow this document. `DESIGN_SYSTEM.md` is legacy.

---

## Product surface

Design Contracts is an **app**, not a brochure site — but it borrows Cursor’s editorial calm rather than a dark-IDE default.

| Principle | Rule |
|-----------|------|
| Chat first | `/` is the chat workspace. Scanning happens in-chat. |
| App chrome | Persistent left sidebar + main canvas. **No marketing footer** on product routes. |
| Cream canvas | Warm cream (`#f7f7f4`), not pure white and not dark-IDE black. |
| Single voltage | **Contract Orange** (`#f54e00`) for primary CTAs and the `.sh` wordmark — used scarcely. |
| Hairline depth | No drop shadows. Cards float via 1px hairlines + white-on-cream contrast. |
| Quiet type | Display weight stays **400** with negative tracking — magazine voice, never tech-bold. |

### Product routes (use `AppShell`)

| Route | Nav label | Purpose |
|-------|-----------|---------|
| `/` | Chat | Primary scan chat |
| `/community` | Library | Scanned Design Contracts directory |
| `/docs` | Docs | API + install guidance |
| `/site/[domain]` | *(detail)* | Full contract — **hydrate from cache/handoff, never auto-rescan** |
| `/features` `/pricing` `/about` | More | Quiet content via `PageCanvas` |
| `/contact` `/privacy` `/terms` | Legal | Same shell |

### Legacy redirects

| From | To |
|------|----|
| `/scan`, `/agent` | `/` (preserve `?url=`) |
| `/community/[domain]` | `/site/[domain]` |

---

## Colors

Mapped into CSS variables in `app/globals.css` (shadcn semantic names).

| Token | Hex | Role |
|-------|-----|------|
| `canvas` / `--background` | `#f7f7f4` | App canvas |
| `canvas-soft` | `#fafaf7` | Soft inset panes |
| `surface-card` / `--card` | `#ffffff` | Panels, composer, rows |
| `ink` / `--foreground` | `#26251e` | Body + display ink (warm near-black) |
| `body` / `--muted-foreground` | `#5a5852` | Secondary copy |
| `muted` | `#807d72` | Captions |
| `hairline` / `--border` | `#e6e5e0` | Default borders |
| `hairline-soft` | `#efeee8` | Softer separators |
| `primary` | `#f54e00` | Contract Orange — CTAs + `.sh` |
| `primary-active` | `#d04200` | Pressed CTA |
| `on-primary` | `#ffffff` | Text on orange |
| `semantic-error` | `#cf2d56` | Errors |
| `semantic-success` | `#1f8a65` | Success |

### Timeline pastels (scan/agent stages only)

Scoped to in-product scan/agent stage indicators — **never** buttons, badges, or marketing accents.

| Stage | Hex |
|-------|-----|
| Thinking | `#dfa88f` |
| Grepping / collect | `#9fc9a2` |
| Reading | `#9fbbe0` |
| Editing | `#c0a8dd` |
| Done | `#c08532` |

Dark mode is optional (theme toggle). Cream light is the **default brand surface**.

---

## Typography

| Role | Family | Notes |
|------|--------|-------|
| Display / UI | **Inter** (CursorGothic substitute) | Weight 400 on display; `-0.03em` tracking on large heroes |
| Titles | Inter 600 | `title-md` 18px / `title-sm` 16px |
| Body | Inter 400 | 14–16px, line-height 1.5 |
| Code / meta | **JetBrains Mono** | Every code surface, install cmds, domain chips |

Avoid bold display. Prefer weight 400–500 for chrome; 600 only for small titles.

---

## Shape & spacing

| Token | Value | Use |
|-------|-------|-----|
| `rounded.md` | 8px | Buttons, inputs (developer dialect) |
| `rounded.lg` | 12px | Cards, panes, composer |
| `rounded.pill` | 9999px | Chips, timeline pills |
| Section rhythm | 80px | Marketing-style section padding when needed |
| App padding | 16–24px | Product canvas |

`--radius: 0.5rem` (8px) as base. **No box-shadow elevation.**

---

## App shell

```
┌─────────────────┐
│ designcontracts.sh │  ← .sh in Contract Orange
│                 │
│ + New chat      │  ← orange primary (scarce)
│ ○ Chat          │
│ ○ Library       │
│ ○ Docs          │
│                 │
│ Recents         │
│ More / legal    │
│ [theme]         │
└─────────────────┘
```

- Sidebar: cream / white-on-cream, hairline `border-border`
- Active nav: soft secondary fill (`#e6e5e0` / muted surface), not orange wash
- Orange only on New chat CTA + wordmark `.sh`

### Chat empty state

1. Brand wordmark (`designcontracts` + orange `.sh`) — weight 400, tight tracking  
2. One line: “Paste a URL. Get an installable Design Contract.”  
3. Quiet domain chips (hairline pills)  
4. Composer docked — white card on cream, 12px radius, hairline border  

### Site / contract detail

- Domain as display title (weight 400)  
- Hairline tabs + white panels  
- Primary download button = Contract Orange  
- Timeline pastels only if showing scan-phase UI  

---

## Component rules

| Do | Don’t |
|----|-------|
| Use `AppShell` + `PageCanvas` | Marketing header/footer forks |
| Semantic tokens (`bg-background`, `text-muted-foreground`) | Hard-code purple/indigo/mint themes |
| Orange for one primary action | Orange washes, gradients, glow |
| Hairline borders | Drop shadows / multi-layer elevation |
| Hydrate `/site` from cache/handoff | Auto-rescan on Open |
| Timeline pastels for stages only | Pastels on CTAs or nav |

---

## Scanning UX

1. Chat URL → `get_tokens` then `scan_site`  
2. Inline widget → **Open** stashes handoff + hydrates Blob  
3. Never auto-rescan; empty state offers Scan now  
4. Blob access auto-falls back public↔private (`BLOB_ACCESS` optional)  

---

## Checklist for new UI

- [ ] Cream canvas + warm ink reads first  
- [ ] At most one orange CTA in view  
- [ ] Display weight 400; JetBrains Mono on code  
- [ ] Hairlines only — no shadows  
- [ ] Lives in `AppShell` if product route  
- [ ] Mobile sidebar sheet still works  
- [ ] Light default looks correct; dark toggle optional  
