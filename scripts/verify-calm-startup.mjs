#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const dashboardPath = resolve(root, 'app/dashboard/page.tsx');
const feedbackWidgetPath = resolve(root, 'app/dashboard/FeedbackWidget.tsx');
const dashboard = readFileSync(dashboardPath, 'utf8');
const feedbackWidget = readFileSync(feedbackWidgetPath, 'utf8');

const checks = [
  {
    name: 'dashboard survey is closed by default',
    pass: /const \[surveyOpen,\s*setSurveyOpen\]\s*=\s*useState\(false\)/.test(dashboard),
  },
  {
    name: 'dashboard never auto-opens the survey modal',
    pass: !/setSurveyOpen\(true\)/.test(dashboard),
  },
  {
    name: 'dashboard documents the calm-startup guard',
    pass: dashboard.includes('Keep startup calm: do not auto-open the survey'),
  },
  {
    name: 'feedback widget is closed by default',
    pass: /const \[open,\s*setOpen\]\s*=\s*useState\(false\)/.test(feedbackWidget),
  },
  {
    name: 'feedback widget opens only from explicit click handler',
    pass: feedbackWidget.includes('onClick={() => setOpen(true)}') && (feedbackWidget.match(/setOpen\(true\)/g) ?? []).length === 1,
  },
  {
    name: 'survey copy is optional and gentle',
    pass: dashboard.includes('Optional check-in') && dashboard.includes('skip anytime'),
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
  console.error(`\nCalm-startup verification failed: ${failed} check(s) failed.`);
  process.exit(1);
}

console.log('\nCalm-startup verification passed.');
