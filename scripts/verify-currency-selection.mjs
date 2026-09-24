#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The onboarding flow lives in app/HomeClient.tsx since the homepage's
// server/client split (15d5a49). The currency *cards* these checks were
// written for were removed as an unreachable screen in 7d3c88c; currency is
// now a native <select> on the income step. The card checks below still
// apply if cards come back; the select checks cover the picker that exists.
const page = ['app/page.tsx', 'app/HomeClient.tsx']
  .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
  .join('\n');
const hasCurrencyCards = /uf-currency-btn/.test(page);
const pageWithoutHoverMedia = page.replace(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*{[\s\S]*?\.uf-currency-btn:hover[\s\S]*?\n\s*}/g, '');
const currencySelect = page.match(/<select\b[^>]*?\bid="([^"]+)"[^>]*?\bvalue=\{currency\}[^]*?<\/select>/);

const cardChecks = [
  {
    name: 'currency buttons expose selected state to assistive tech',
    pass: page.includes('aria-pressed={selected === currency}'),
  },
  {
    name: 'currency card hover is limited to hover-capable devices',
    pass: /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*{[\s\S]*\.uf-currency-btn:hover/.test(page),
  },
  {
    name: 'currency card has no global sticky hover style',
    pass: !/^\s*\.uf-currency-btn:hover/m.test(pageWithoutHoverMedia),
  },
  {
    name: 'selected currency remains the only persistent highlighted state',
    pass: /\.uf-currency-btn\.selected\s*{[^}]*border-color:\s*var\(--accent\)[^}]*background:\s*var\(--accent-dim\)[^}]*box-shadow:\s*0 0 0 1px var\(--accent\)/.test(page),
  },
];

const selectChecks = [
  {
    name: 'onboarding currency picker is a controlled native select (selected state is exposed natively)',
    pass: !!currencySelect && /onChange=\{[^}]*onCurrencyChange/.test(currencySelect[0]),
  },
  {
    name: 'onboarding currency select has an accessible name from a real label',
    pass: !!currencySelect && new RegExp(`<label[^>]*htmlFor="${currencySelect[1]}"[^>]*>\\s*Currency`).test(page),
  },
];

const checks = hasCurrencyCards ? [...cardChecks, ...selectChecks] : selectChecks;

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`✓ ${check.name}`);
  } else {
    failed += 1;
    console.error(`✗ ${check.name}`);
  }
}

if (failed > 0) {
  console.error(`\nCurrency selection verification failed: ${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nCurrency selection verification passed.');
