#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const source = readFileSync('app/dashboard/page.tsx', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`x ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes('const lastCompletedMonth = consistencyMonths.find((m) => m.key === prevMonthKey) ?? null;'),
  'check-in looks up last month by calendar key, not consistencyMonths[0] (which can be the current in-progress month)'
);

assert(
  source.includes('localStorage.getItem(`uf_checkin_dismissed_${currentMonthKey}`) === "1"') &&
    source.includes('localStorage.setItem(`uf_checkin_dismissed_${currentMonthKey}`, "1")'),
  'check-in dismiss state is scoped per calendar month, so it reappears next month'
);

assert(
  source.includes('{!checkinDismissed && topTasks.length > 0 && ('),
  'check-in card only renders when there is a real recommendation to show'
);

assert(
  source.includes('id="uf-top-tasks-card"') &&
    source.includes('document.getElementById("uf-top-tasks-card")?.scrollIntoView({ behavior: "smooth", block: "center" });'),
  'check-in CTA scrolls to the existing top-tasks card instead of duplicating its content'
);

assert(
  source.includes('trackNextMoveOpened({ topPriority: topTasks[0]?.priority ?? 0 });'),
  'opening the check-in\'s move fires the next-move-opened event, not the dismiss action'
);

const analyticsEvents = readFileSync('lib/analytics-events.ts', 'utf8');
assert(
  analyticsEvents.includes("NEXT_MOVE_OPENED: 'funnel_next_move_opened',"),
  'funnel_next_move_opened is registered in the event contract'
);

const analytics = readFileSync('lib/analytics.ts', 'utf8');
assert(
  analytics.includes('export function trackNextMoveOpened(input: { topPriority: number }) {'),
  'trackNextMoveOpened helper exists and matches trackNextMoveViewed\'s shape'
);

console.log('Monthly check-in card regression passed');
