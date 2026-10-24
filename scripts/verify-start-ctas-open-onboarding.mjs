import fs from 'node:fs';

// A signed-out visitor who presses a public page's start button must reach the
// calculator, not /dashboard or /login: those send them through sign-up and
// onto Home with no plan, skipping onboarding. Signed-in visitors are still
// fine, because the homepage forwards them to /dashboard on its own.
const pages = [
  'app/fire-number/page.tsx',
  'app/fire-number/best-states/page.tsx',
  'app/fire-number/cheapest-cities/page.tsx',
  'app/fire-number/most-expensive-cities/page.tsx',
  'app/fire-number/no-income-tax-states/page.tsx',
  'app/pricing/page.tsx',
  'app/calculators/purchase-impact/PurchaseImpactCalculator.tsx',
];

let failed = false;
for (const file of pages) {
  const source = fs.readFileSync(file, 'utf8');
  if (/href=["'{`]+\/(dashboard|login)["'`}]/.test(source)) {
    console.error(`FAIL: ${file} links a start button to /dashboard or /login; use /?start=onboarding&source=...`);
    failed = true;
  }
  if (!/start=onboarding/.test(source)) {
    console.error(`FAIL: ${file} has no start=onboarding link.`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`PASS: ${pages.length} public start buttons open onboarding.`);
