#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const page = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8');
const pageWithoutHoverMedia = page.replace(/@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)\s*{[\s\S]*?\.uf-currency-btn:hover[\s\S]*?\n\s*}/g, '');

const checks = [
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
