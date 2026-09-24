#!/usr/bin/env node
/**
 * Every result step is measured, once.
 *
 * Between seeing a freedom date and clicking save there are six screens, and
 * only the click was recorded, so a result that never became a signup could
 * not say where it stopped.
 *
 * Run: npm run test:reveal-step-tracking
 */
import { readFileSync } from 'node:fs';

// Read from source: analytics-events imports './pricing' without an
// extension, which the revenue-funnel guard requires and Node can't load.
const events = readFileSync('lib/analytics-events.ts', 'utf8');
const idBlock = events.match(/REVEAL_STEP_IDS: Record<number, RevealStepId> = \{([^}]*)\}/)?.[1] ?? '';
const REVEAL_STEP_IDS = Object.fromEntries([...idBlock.matchAll(/(\d+): '([a-z_]+)'/g)].map((m) => [Number(m[1]), m[2]]));

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok, detail });

const flow = readFileSync('app/components/RevealFlow.tsx', 'utf8');
const stepsRendered = [...flow.matchAll(/\{step === (\d) && \(/g)].map((m) => Number(m[1]));
check('every rendered result step has an id',
  stepsRendered.length === 6 && stepsRendered.every((n) => typeof REVEAL_STEP_IDS[n] === 'string'),
  `rendered ${stepsRendered.join(',')}; ids for ${Object.keys(REVEAL_STEP_IDS).join(',')}`);
check('ids are distinct', new Set(Object.values(REVEAL_STEP_IDS)).size === Object.keys(REVEAL_STEP_IDS).length);
check('the event name is in the contract', /REVEAL_STEP_VIEWED: 'funnel_reveal_step_viewed'/.test(events));

const effectAt = flow.indexOf('onStepViewedRef.current?.(step, unreachable)');
const firstEarlyReturn = flow.indexOf('if (step === 1) return');
check('each step is reported by a hook declared before the early returns',
  effectAt > 0 && firstEarlyReturn > 0 && effectAt < firstEarlyReturn);
check('a step already seen is not reported again',
  /seenSteps\.current\.has\(seenKey\)\) return;[\s\S]{0,80}seenSteps\.current\.add\(seenKey\)/.test(flow));
check('the loader is not reported, and the unreachable screen counts once',
  /step < 2 \? null : unreachable \? "unreachable" : String\(step\)/.test(flow));
const home = readFileSync('app/HomeClient.tsx', 'utf8');
check('the page sends each reported step with its id',
  /onStepViewed=\{\(step, unreachable\) => trackRevealStepViewed\(\{\s*stepId: unreachable \? "unreachable" : REVEAL_STEP_IDS\[step\]/.test(home));

const doc = readFileSync('docs/analytics/EVENTS.md', 'utf8');
check('the event is documented', /### `funnel_reveal_step_viewed`/.test(doc) &&
  Object.values(REVEAL_STEP_IDS).every((id) => doc.includes(`\`${id}\``)) && doc.includes('`unreachable`'));

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.detail && !c.ok ? `  — ${c.detail}` : ''}`);
  if (!c.ok) failed++;
}
console.log(failed ? `\nReveal step tracking verification failed: ${failed} check(s).` : '\nReveal step tracking verification passed');
process.exit(failed ? 1 : 0);
