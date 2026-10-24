#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const src = readFileSync('app/dashboard/TransactionsTab.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

assert(
  src.includes('expenseCategories={allExpenseCats}'),
  'transaction list receives merged built-in + user-created expense categories'
);

assert(
  src.includes('const allCategories = useMemo(() => [...expenseCategories, ...INCOME_CATEGORIES], [expenseCategories]);'),
  'transaction list builds lookup metadata from user-created categories too'
);

assert(
  !src.includes('const cat = ALL_CATEGORIES.find((c) => c.key === tx.category);'),
  'transaction row icon lookup no longer ignores manual categories'
);

assert(
  src.includes('const cat = allCategories.find((c) => c.key === tx.category);'),
  'transaction rows resolve color/emoji/label from merged category metadata'
);

assert(
  // The summary's category bars (SpendCard, D-30) are built from
  // allExpenseCats, which appends the custom categories, and each one takes
  // its own colour and emoji through resolveDisplay.
  src.includes('expenseCategories={allExpenseCats}') &&
  /const allExpenseCats = useMemo\(\(\) => \{[^]*?return \[\.\.\.EXPENSE_CATEGORIES, \.\.\.uniqueCustom\];/.test(src) &&
  /const catDisplay = useCallback\([^]*?resolveDisplay\(\{ color: c\.color, emoji: c\.emoji \?\? "📦" \}, catCustomizations, c\.key\)/.test(src) &&
  src.includes('const expenseCatDisplay = useMemo(() => catDisplay(allExpenseCats)'),
  'monthly summary also includes custom category colors and emoji'
);

console.log('\nManual category icon regression checks passed.');
