#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const src = readFileSync('app/dashboard/CategoriesTab.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

assert(
  src.includes('All Categories'),
  'Categories page labels the management list as All Categories'
);

assert(
  !src.includes('if (catTxns.length === 0) return null'),
  'zero-spend categories are not filtered out of the category list'
);

assert(
  src.includes('Your full category list is still shown below'),
  'no-expense state keeps the full category management list visible'
);

assert(
  src.includes('deleteConfirmKey') && src.includes('Confirm delete category') && src.includes('Cancel'),
  'custom category deletion requires an explicit second confirmation step'
);

assert(
  src.includes('Existing transactions keep their category key'),
  'delete confirmation explains existing transactions are preserved'
);

assert(
  src.includes('handleDeleteCustomCat') && src.includes('localStorage.setItem("uf_custom_cats"') && src.includes('_custom_cats: updated'),
  'custom category deletion updates local storage and Supabase sync payload'
);

console.log('\nCategory management regression checks passed.');
