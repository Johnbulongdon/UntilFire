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
    // Two openers, both a person's own action: the floating button, and the
    // monthly email's "Tell me what to build next" link, which lands on
    // /dashboard?feedback=feature (6a76189). Anything else opening it is the
    // unprompted survey this guard exists to stop.
    name: 'feedback widget opens only from an explicit click or the ?feedback= link someone clicked',
    pass: (() => {
      const openers = feedbackWidget.match(/setOpen\(true\)/g) ?? [];
      if (openers.length !== 2 || !feedbackWidget.includes('onClick={() => setOpen(true)}')) return false;
      // The deep-link opener must bail out when the param is absent, and
      // strip it afterwards so a refresh does not reopen the dialog.
      const link = feedbackWidget.match(/params\.get\("feedback"\)[^]*?setOpen\(true\)[^]*?replaceState/);
      return !!link && /if \(requested === null\) return;/.test(link[0]) && /params\.delete\("feedback"\)/.test(link[0]);
    })(),
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
