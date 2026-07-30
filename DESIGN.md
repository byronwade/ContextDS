# Design Contracts — DESIGN.md

Canonical product design system for **designcontracts.sh**.  
**Warm Paper Workbench** — calm professional instrument: cream canvas, warm-white paper, terracotta accent, Shopify-style bevels.

All UI work must follow this document. `DESIGN_SYSTEM.md` is legacy.

---

## Product surface

Design Contracts is an **app workbench**, not a brochure site.

| Principle | Rule |
|-----------|------|
| Chat first | `/` is the centered action canvas. Scanning happens in-chat. |
| App chrome | Canvas + 240px sidebar + **inset paper workspace**. No marketing footer. |
| Warm canvas | Outer `#f3eee5`; paper surfaces `#fffdf8`. Never pure white page bg. |
| Single accent | Terracotta `#9b4f32` — scarce primary actions + `.sh` wordmark. |
| Bevel depth | Controls use inset `--shadow-control`; paper uses `--shadow-paper`. |
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
Outer warm canvas (dark `#161310` / light `#f3eee5`)
├── Global sidebar: 240px (on canvas, no card chrome)
│   └── Theme segment (Dark / Light / Auto)
└── Inset workspace: 8px inset, 12px radius paper
    ├── Utility strip: live Redis stats (36–44px)
    ├── Optional location / view bars (integrated paper__toolbar)
    └── Task body (chat / list / document)
```

Rules:
- Toolbar + body + footer = **one paper sheet** (no floating toolbars).
- Prefer `--ui-border-soft` everywhere; `--ui-border` only for shell edges.
- Theme defaults to **dark**; FOUC script + `html.dark` enforce it.

---

## Colors

Defined in `app/globals.css` as `--ui-*` and mapped to shadcn semantics.

| Token | Value | Role |
|-------|-------|------|
| `--ui-canvas` | `#f3eee5` | Outer app canvas |
| `--ui-paper` | `#fffdf8` | Workspace / cards |
| `--ui-paper-subtle` | `#faf5ec` | Toolbar tint, insets |
| `--ui-paper-hover` | `#f5eee3` | Hover fill |
| `--ui-paper-selected` | `#ede3d5` | Selected nav / segment |
| `--ui-ink` | `#2b2723` | Primary text |
| `--ui-ink-secondary` | `#675f57` | Body secondary |
| `--ui-ink-muted` | `#766e65` | Meta / captions |
| `--ui-accent` | `#9b4f32` | Primary CTA |
| `--ui-accent-hover` | `#7a3f2a` | Pressed CTA |
| `--ui-accent-soft` | `#f4e5db` | Soft accent wash |
| `--ui-border-soft` | `rgba(67,52,38,0.10)` | Internal dividers |
| `--ui-border` | `rgba(67,52,38,0.15)` | Default borders |
| `--ui-border-edge` | `rgba(67,52,38,0.22)` | Shell edges |

Dark mode is optional (warm dark paper). Light warm paper is the brand default.

---

## Shadows

| Token | Use |
|-------|-----|
| `--shadow-control` | Buttons, inputs, segmented controls |
| `--shadow-control-primary` | Primary buttons |
| `--shadow-paper` | Persistent cards / inset workspace |
| `--shadow-paper-hover` | Interactive cards (≤1px lift) |
| `--shadow-float` | Menus, dialogs, drawers |

Do **not** stack paper shadows through nested cards. Rows and nav items: no external shadow.

---

## Typography

| Role | Spec |
|------|------|
| UI / body | Inter (`--font-ui`), 13–15px |
| Dense labels / meta | 12–13px, muted ink |
| Section titles | 18–22px semibold |
| Page titles | 22–28px semibold, restrained tracking |
| Code / domains | JetBrains Mono |
| Counts / dates | Tabular numerals |

---

## Controls

| Size | Height | Use |
|------|--------|-----|
| Compact | 28px | Icon buttons, dense chrome |
| Normal | 32px | Default buttons / inputs |
| Emphasis | 36px | Rare high-emphasis only |

Beveled paper buttons via `Button` variants. At most one primary action per local region.

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
| `AppShell` + inset paper | Marketing header/footer forks |
| `--ui-*` / semantic tokens | Cool blue-gray outlines, pure-white canvas |
| One terracotta primary | Accent washes, purple gradients, glow |
| Integrated `paper__toolbar` | Floating rounded toolbars above content |
| Bevel controls + paper lift | Shadow on every nested box |
| Hydrate `/site` from cache/handoff | Auto-rescan on Open |

---

## Scanning UX

1. Chat URL → tools → inline contract widget  
2. **Open** stashes handoff + hydrates Blob  
3. Never auto-rescan; empty state offers Scan now  
4. Redis stats strip ticks live (optimistic bumps + 4s poll)

---

## Checklist for new UI

- [ ] Outer canvas `#f3eee5`, paper `#fffdf8`
- [ ] Inset workspace reads as one sheet
- [ ] Controls 28/32px with bevel shadows
- [ ] At most one terracotta CTA in view
- [ ] Archetype chosen (action / document / operational)
- [ ] No nested card-shadow stacks
- [ ] Mobile drawer + touch targets OK
- [ ] Light default correct; dark optional
