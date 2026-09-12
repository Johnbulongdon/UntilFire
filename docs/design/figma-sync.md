# Figma sync

The Figma file is a **derived artifact**. The code is the source of truth.

- File: <https://www.figma.com/design/xX5Ts74m8bwGYrUURhuYdl>
- File key: `xX5Ts74m8bwGYrUURhuYdl`
- Generated from: `app/globals.css` (tokens) and `components/ui/` (primitives)

## Why derived and not authored

Two sources of truth drift, and the one that is not compiled always loses. The
code is typechecked and built on every change; a Figma library is updated when
someone remembers. So nothing in the file is hand-authored: every variable,
style and component was generated from the code, and every variable carries its
CSS custom property as Figma **code syntax** — `color/light/green` reads as
`var(--uf-green)` in Dev Mode.

**Do not edit values in Figma.** A hand-edit makes the two disagree silently,
with no build to catch it. Change the token in `app/globals.css`, then
regenerate.

## What is in the file

| Page | Contents |
|---|---|
| Cover & Foundations | Cover, colour boards for both themes, type ramp, radius, elevation, space |
| Components | Button (12 variants), Badge (5), Card (3), Alert (4) |
| Charts, Logo & Motion | Empty — see "Not yet generated" |

Variables: 58 colour (29 tokens × 2 themes), 11 scale (4 radius + 7 space).
Styles: 9 text, 3 elevation.

## Starter-plan limitations

These are plan constraints, not design decisions. Both lift on Professional.

- **One mode per variable collection.** Light and dark cannot be Figma modes, so
  they are two token groups: `color/light/*` and `color/dark/*`. On Professional
  this should become one `Color` collection with Light and Dark modes, and the
  variable names lose the theme segment.
- **Three pages.** The library convention is one page per component; here all
  four component sets share the Components page in labelled sections.

## Regenerating

Ask an agent with the Figma connector:

> Regenerate the UntilFire Figma UI kit from the code. File key
> `xX5Ts74m8bwGYrUURhuYdl`. Load the `figma-use` and `figma-generate-library`
> skills first.

The generation scripts look every entity up by name before creating it and
update in place, so re-running is safe and will not duplicate. Regenerate after
any change to:

- the `--uf-*` custom properties in `app/globals.css`
- the variant or tone lists in `components/ui/*.tsx`
- the `.uf-t-*` type scale

## Known intentional divergence

`Button` variant `Primary` uses literal white text rather than a token, because
the code does: `Button.tsx` sets `color: "#fff"` on the primary variant. There is
no `--uf-*` token for pure white on green. If a token is added, update both.

## Not yet generated

Charts, the logo lockups, motion, and the money primitives (`Money`, `Delta`,
`Progress`, `SegmentedControl`, `Field`, `Stat`) are not in the file yet. The
live reference at `/styleguide` covers all of them.
