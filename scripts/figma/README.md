# Figma generation scripts

The Figma UI kit is a **derived artifact**. These scripts are how it is derived.

Each file is Figma Plugin API JavaScript, written to be pasted into the
`use_figma` MCP tool (or a Figma plugin console) against the kit file:

- File: <https://www.figma.com/design/xX5Ts74m8bwGYrUURhuYdl>
- File key: `xX5Ts74m8bwGYrUURhuYdl`

They exist in the repo rather than only in an agent's chat history because a
derived artifact is only as durable as the thing that derives it. If these
scripts live in a conversation, the file is one lost session away from being
unreproducible — which is the failure mode a derived artifact is supposed to
avoid.

## Running them

Load the `figma-use` and `figma-generate-library` skills first — they are
mandatory prerequisites for `use_figma` and encode rules that are easy to get
wrong (page context resets between calls, colours are 0–1 not 0–255,
`figma.notify()` throws).

Then run the scripts in order. Each one:

- looks every entity up by name before creating it, so re-running updates in
  place instead of duplicating
- returns the ids of everything it touched
- is safe to run against a partially built file

```
01-variables.js    colour + scale collections          ✅ applied
02-styles.js       text styles + elevation styles      ✅ applied
03-foundations.js  cover, colour boards, type ramp     ✅ applied
04-components.js   Button, Badge, Card, Alert          ✅ applied
05-symbols.js      the eight glyphs                    ⛔ pending
06-charts.js       series palette + chart specimens    ⛔ pending
07-motion.js       durations + easing curves           ⛔ pending
```

## Why three are pending

The Figma Starter plan caps how many MCP tool calls an agent may make against
a file. The build hit that ceiling partway through the third page. The pending
scripts are complete and ready — they just could not be executed.

## Plan limits that shaped the output

Not design decisions. All three lift on Professional.

| Limit | Consequence |
|---|---|
| 1 mode per variable collection | light and dark are two token groups, not switchable modes |
| 3 pages per file | components share a page instead of one page each |
| MCP tool call cap | three sections still pending |

## Keeping it true

Regenerate after any change to:

- the `--uf-*` custom properties in `app/globals.css`
- the variant or tone lists in `components/ui/*.tsx`
- `ICON_PATHS` in `components/ui/Icon.tsx`
- the `.uf-t-*` type scale

Do not edit values in Figma. The code is the source of truth, and a hand-edit
makes the two disagree with no build to catch it.
