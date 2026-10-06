import assert from 'node:assert/strict';
import { springFrames, animateSelection } from '../lib/onboarding-motion.ts';

const frames = springFrames(.92, 1);
const scales = frames.map(frame => Number(frame.transform.match(/scale\(([^)]+)\)/)[1]));
assert.equal(scales[0], .92);
assert.equal(scales.at(-1), 1);
assert(scales.every(value => Number.isFinite(value) && value >= .92 && value < 1.04));
assert(scales.some(value => value > 1), 'Spring settles after a controlled overshoot');
assert(frames.every((frame, i) => frame.offset === i / (frames.length - 1)));
let called = false;
globalThis.matchMedia = () => ({ matches: true });
assert.equal(animateSelection({ animate() { called = true; } }), undefined);
assert.equal(called, false, 'Reduced motion never starts a selection animation');
animateSelection({ animate() { called = true; return {}; } }, true);
assert.equal(called, true, 'An explicit preview opt-in can override the system');
console.log('Spring endpoints, bounded settling and reduced-motion guard passed.');
