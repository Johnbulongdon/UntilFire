# UntilFire Design System — v3 Warm

Agreed with John on 2026-08-27 (v3 Warm; the system itself landed 2026-08-26). This is the default for all design and all code
from here on. Tokens live in `app/globals.css`; primitives live in
`components/ui/`.

It exists because the app had no system, only a memory of one — each screen was
built by approximating the last. Measured before this document: **44 font sizes,
23 border radii, 25 spacing values, 8 greens, 302 hand-rolled buttons, 0 shared
components.** Two fonts (Syne, DM Sans) were referenced but never loaded, so
they had never rendered.

The visual language is **v3 Warm**, chosen from four directions explored on
2026-08-27.

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
| **Ground** | Warm cream `#FDF8F1`, light default; warm dark `#16120D` via `.dark`, every route |
| **Display** | Fraunces — freedom date, page titles, h1/h2. Display sizes only |
| **Body** | Manrope — everything h3 and below |
| **Data** | DM Mono, tabular numerals — every figure, date, percentage |
| **Marketing serif** | Instrument Serif — landing page and HomeClient hero only |

Money apps are cold; this one deliberately isn't. Neutrals are **warm all the way
down** — ink is `#221B12`, not black — and shadows are warm too
(`rgba(120,80,30,…)`). Dark mode keeps the warmth: a warm near-black, not the
usual blue-black, so the personality survives the toggle.

Radius is generous (12 control / 20 card / 28 modal) and buttons are full pills.

### Why teal for freedom

Green is taken (acts), red is taken (negative), amber is taken (warning). Teal is
the only cool note in a warm system — and that contrast is the argument *for* it:
the colour that doesn't belong to the warm world is the one that means escape
from it. It also collides with nothing, and it's the brand colour already in use.

Gold was considered and rejected: it sits next to the warning amber, so a
"2.4 years earlier" badge and a "due in 5d" badge read as the same temperature in
the same Cashflow list.

### Contrast

Badge text is 11px, which needs 4.5:1. The base brand colours pass at display
size but not at 11px, so badges use the `--uf-*-ink` variants, solved for AA
rather than eyeballed. All 14 foreground/background pairs pass in both themes —
re-check with the solver in the commit if you change a colour.

## Scales

Use these. Nothing between the steps.

| Scale | Steps | Was |
| --- | --- | --- |
| Type | 56 · 34 · 24 · 18 · 16 · 14 · 13 · 11 | 44 sizes |
| Space | 4 · 8 · 12 · 16 · 24 · 32 · 48 | 25 values |
| Radius | 12 control · 20 card · 28 modal · 999 pill | 23 values |
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
