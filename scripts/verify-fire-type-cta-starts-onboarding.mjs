import fs from 'node:fs';

const fireTypePage = fs.readFileSync('app/fire-type/page.tsx', 'utf8');
const homePage = fs.readFileSync('app/page.tsx', 'utf8');

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

assert(
  homePage.includes('start') && homePage.includes('onboarding') && homePage.includes('setScreen("city")'),
  'Homepage must read the start=onboarding URL intent and open the first onboarding step.',
);

console.log('FIRE Type CTA onboarding regression passed');
