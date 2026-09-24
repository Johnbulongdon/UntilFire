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

// Since f39a66f, persistence lives in the shared useCustomCategories hook: the
// tab removes the category from the hook's state, and the hook writes every
// change to local storage and syncs it to user_budget.expenses._custom_cats.
const hook = readFileSync('lib/useCustomCategories.ts', 'utf8');
const deleteHandler = src.match(/const handleDeleteCustomCat = [^]*?\n  \};/)?.[0] ?? '';
assert(
  /useCustomCategories\(\)/.test(src) &&
    /setCustomCats\(\(prev\) => prev\.filter\(\(c\) => c\.key !== key\)\)/.test(deleteHandler) &&
    /CUSTOM_CATS_KEY = "uf_custom_cats"/.test(hook) &&
    /useEffect\(\(\) => \{ localStorage\.setItem\(CUSTOM_CATS_KEY, JSON\.stringify\(customCats\)\); \}, \[customCats\]\)/.test(hook) &&
    /_custom_cats: cats/.test(hook) && /syncToSupabase\(customCats, customSubCats\)/.test(hook),
  'custom category deletion updates local storage and Supabase sync payload'
);

// A Supabase query builder sends nothing until it is awaited or .then()'d. The
// hook's upsert was left bare from f39a66f, so no change ever reached the
// account and the refetch on focus restored deleted categories.
assert(
  /\.upsert\(\{[^]*?_custom_cats: cats[^]*?\}, \{ onConflict: "user_id" \}\)\s*\.then\(/.test(hook) ||
    /await supabase\.from\("user_budget"\)\.upsert\(/.test(hook),
  'the custom category sync actually sends its upsert'
);

console.log('\nCategory management regression checks passed.');
