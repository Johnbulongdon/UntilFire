import fs from 'node:fs';

const fireTypePage = fs.readFileSync('app/fire-type/page.tsx', 'utf8');
// The homepage flow moved into app/HomeClient.tsx with the server/client split
// (15d5a49); read both.
const homePage = ['app/page.tsx', 'app/HomeClient.tsx']
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(
  /ctaHref\s*=\s*`\/\?[^`]*start=onboarding/.test(fireTypePage),
  'FIRE Type result CTA must include start=onboarding so it does not land on the homepage hero.',
);

// The first onboarding step is whatever the landing page's own Start button
// opens; the URL intent must open that same step, so the two cannot drift.
const firstStep = homePage.match(/<LandingPage onStart=\{\(\) => setScreen\("([a-z]+)"\)\}/)?.[1];
const intentStep = homePage.match(/get\("start"\) === "onboarding"\)\s*\{\s*setScreen\("([a-z]+)"\)/)?.[1];
assert(
  !!firstStep && intentStep === firstStep,
  `Homepage must read the start=onboarding URL intent and open the first onboarding step (Start opens "${firstStep}", the intent opens "${intentStep}").`,
);

console.log('FIRE Type CTA onboarding regression passed');
