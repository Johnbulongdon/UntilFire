# UI kit snapshot

`ui-kit.html` is a self-contained copy of the UI kit reference — every token,
primitive, symbol, chart form, logo asset and motion curve, in both themes.
Open it in a browser; it needs no build and no network.

It is also published as an Artifact:
<https://claude.ai/code/artifact/3e97418a-5dcb-4de2-9c8b-48a3764f996d>

## This is a snapshot, not the source

Read this before trusting anything in it.

| | |
|---|---|
| **Source of truth** | `components/ui/` and `app/globals.css` |
| **Live reference** | `/styleguide` — renders the *real* components, cannot drift |
| **This file** | a hand-maintained copy, correct on the date it was written |

The live route imports the actual primitives, so it is wrong only if the
components are wrong. This file re-implements them in plain HTML and CSS, so
it goes stale the moment a token or a variant changes and nothing will tell
you.

Keep it for the cases the route cannot serve: reading offline, sending to
someone without repo access, or checking what the kit looked like at a point
in time. For anything else, use `/styleguide`.

## Updating it

Ask an agent to regenerate it from `/styleguide` and republish the artifact.
Do not hand-edit — a hand-edit is how a snapshot becomes a second opinion.
