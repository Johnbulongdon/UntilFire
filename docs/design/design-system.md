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

Green (`--uf-green`) identifies primary actions and action links. Neutral
secondary/ghost controls and red destructive actions (`--uf-neg`) are valid,
as implemented by `Button`; not every interactive affordance must be green.
Use labels, icons, or other cues as well as color to communicate meaning.

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
| **Data** | DM Mono, tabular numerals — financial figures, dates, percentages; prominent freedom-date display uses Fraunces |
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

Badge text is 11px and needs 4.5:1 contrast. Use the `--uf-*-ink` variants
instead of assuming base brand colors work at that size. Verify the actual
foreground/background combinations in both themes when changing colors.
Target WCAG 2.2 AA; these tokens are not proof of current app-wide compliance.

## Scales

Use these for new layouts. Existing shared primitives have bounded internal
exceptions below; those are not extra general-purpose scale steps.

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

### Bounded primitive exceptions

Keep existing component sizing when reusing primitives: `Button` uses 15px
large text and padding of 8px/16px (sm), 11px/22px (md), and 14px/28px (lg).
`Stat` uses a 20px medium value, 12px delta text, and 5px internal spacing.
These component-specific values are not permission to invent page-level sizes
or rewrite UI during documentation work. Review and document new exceptions
at the primitive level. `Button`'s primary label uses `--uf-card`, not white:
white on the dark theme's green (`#2FA383`) is 3.1:1, under the 4.5:1 its
text needs, while `--uf-card` is 4.5:1 on the light green and 5.5:1 on the
dark one. Reuse `Button` (or that colour) for green-filled actions rather
than inventing an `--uf-on-green` token. `Logo variant="auto"` belongs on
any surface that follows the theme; `light` and `dark` are for surfaces that
stay one colour in both themes.

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
3. **Use the scales** for layout, retaining documented primitive exceptions.
4. **Financial data uses DM Mono** with tabular numerals — currency, dates,
   percentages, table columns, and `Stat` values. The prominent freedom-date
   display is the deliberate Fraunces exception; a date in a table or `Stat`
   remains data, including when its tone is `freedom`.
5. **Teal is not a button.** See the one rule.
6. **Both themes, always.** Use tokens, then verify light and dark rendering;
   tokens alone do not guarantee contrast, hierarchy, or correct states.

## Interaction and verification

Follow the shared checks in `AGENTS.md`: labeled inputs and associated errors,
keyboard access, visible focus, appropriate touch targets, reduced motion, and
meaning beyond color. Browser QA includes 390px and 1280px viewports, overflow
checks, expected states, and touch interaction where applicable. Use available
tooling rather than assuming fixed browser installation paths.

Navigation follows `docs/design/app-structure.md`: Money includes operational
budgets and upcoming payments as well as recorded finances; Plan handles
long-term projections and scenarios. Home owns no independent financial inputs,
but its card layout can be customised.

## Migration

No freeze, no big-bang refactor. Existing screens carry ~2,000 hardcoded hex
values and they keep working — `globals.css` maps the old token names
(`--uf-card`, `--uf-text`, `--uf-bg`) onto the new ones as aliases.

**Adopt on touch:** when you're already editing a file, migrate the parts you
touched. New surfaces use the system from the start.

The Plan lever panel, the Cashflow redesign and the debt roadmap are all new
surfaces — they should be built entirely on these primitives, and they're the
reason this landed before them rather than after.
