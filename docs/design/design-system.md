# UntilFire Design System — v1

Agreed with John on 2026-08-26. This is the default for all design and all code
from here on. Tokens live in `app/globals.css`; primitives live in
`components/ui/`.

It exists because the app had no system, only a memory of one — each screen was
built by approximating the last. Measured before this document: **44 font sizes,
23 border radii, 25 spacing values, 8 greens, 302 hand-rolled buttons, 0 shared
components.** Two fonts (Syne, DM Sans) were referenced but never loaded, so
they had never rendered.

## The one rule

> **Green acts. Teal means freedom.**

Green (`--uf-green`) is every button, link, and interactive affordance.

Teal (`--uf-teal`) is reserved for **progress toward the freedom date** — the
freedom date itself, progress bars, "2.4 years earlier", time saved. Teal never
appears on a button and never means generic success (that's `--uf-pos`).

The point is that teal carries meaning. Whenever someone sees it, it says *you
moved closer*. Spending it on decoration destroys the only colour in the product
that means something.

## Decisions

| | Decision |
| --- | --- |
| **Ground** | Light default, dark via `.dark` on `<html>`, available on every route |
| **Display** | Bricolage Grotesque — freedom date, page titles, h1/h2 |
| **Body** | Manrope — everything else |
| **Data** | DM Mono, tabular numerals — every figure, date, percentage |
| **Marketing serif** | Instrument Serif — landing page and HomeClient hero only |

Neutrals are **tinted green, not grey** (`#F6FAF8`, not `#F7F9FB`), and shadows
are tinted the same way (`rgba(6,58,44,…)`, never black). It's a two-point shift
nobody consciously notices and it's most of the difference between a default
Tailwind app and one somebody designed.

## Scales

Use these. Nothing between the steps.

| Scale | Steps | Was |
| --- | --- | --- |
| Type | 52 · 34 · 24 · 18 · 16 · 14 · 13 · 11 | 44 sizes |
| Space | 4 · 8 · 12 · 16 · 24 · 32 · 48 | 25 values |
| Radius | 8 control · 12 card · 18 modal · 999 pill | 23 values |
| Elevation | e1 · e2 · e3 | ad hoc |
| Weight | 400 · 500 · 600 · 700 · 800 | 7 — kept |

Type classes are in `globals.css`: `.uf-t-display`, `.uf-t-h1`, `.uf-t-h2`,
`.uf-t-h3`, `.uf-t-lead`, `.uf-t-body`, `.uf-t-small`, `.uf-t-label`,
`.uf-t-data`.

## The primitives

```tsx
import { Button, Card, Field, Input, Badge, Stat } from "@/components/ui";
```

- **Button** — `primary | secondary | ghost | danger` × `sm | md | lg`.
  Only one `primary` per screen. If two things are both primary, one isn't.
- **Card** — `flat | raised | float`.
- **Field / Input / Select** — labelled control with hint and error.
  Pass `numeric` on anything holding a figure.
- **Badge** — `positive | negative | warning | freedom | muted`.
- **Stat** — label, figure, delta. The shape you render on nearly every screen.

## Rules for new code

1. **Never hand-roll** a button, card, labelled input, status pill, or
   label-figure-delta block. Use the primitive.
2. **Never write a hex colour.** Use a token. A colour you can't find a token
   for is a colour that needs a token, not a literal.
3. **Never invent a size, radius, or gap.** Pick the nearest step on the scale.
4. **Every figure uses DM Mono** with tabular numerals — currency, dates,
   percentages, table columns.
5. **Teal is not a button.** See the one rule.
6. **Both themes, always.** Style through tokens so `.dark` works for free.
   A colour defined outside the token system is a colour pinned to light mode.

## Migration

No freeze, no big-bang refactor. Existing screens carry ~2,000 hardcoded hex
values and they keep working — `globals.css` maps the old token names
(`--uf-card`, `--uf-text`, `--uf-bg`) onto the new ones as aliases.

**Adopt on touch:** when you're already editing a file, migrate the parts you
touched. New surfaces use the system from the start.

The Plan lever panel, the Cashflow redesign and the debt roadmap are all new
surfaces — they should be built entirely on these primitives, and they're the
reason this landed before them rather than after.
