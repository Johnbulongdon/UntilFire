/**
 * Freedom-year sharing (D-98): the link and its preview carry the year only,
 * and a hand-edited link can't put anything else on the image.
 *
 * Run: npm run test:freedom-share
 */
import { readFileSync } from 'node:fs'
import { freedomSharePath, freedomShareText, parseFreedomYear } from '../lib/freedom-share.ts'

const checks: { name: string; ok: boolean }[] = []
const check = (name: string, ok: boolean) => checks.push({ name, ok })
const now = new Date('2026-10-22T00:00:00Z')

check('a near year parses', parseFreedomYear('2041', now) === 2041)
check('this year parses', parseFreedomYear('2026', now) === 2026)
check('a past year is refused', parseFreedomYear('2025', now) === null)
check('more than 80 years out is refused', parseFreedomYear('2107', now) === null)
check('text is refused', parseFreedomYear('2041<b>', now) === null && parseFreedomYear('soon', now) === null)
check('a missing value is refused', parseFreedomYear(undefined, now) === null && parseFreedomYear(['2041'], now) === null)
check('the link carries only the year', freedomSharePath(2041) === '/share/freedom?y=2041')
check('the share text names only the year', freedomShareText(2041) === 'I could be free to stop working in 2041. When could you?')

const page = readFileSync(new URL('../app/share/freedom/page.tsx', import.meta.url), 'utf8')
check('the share page is noindex', page.includes('robots: { index: false'))
check('the share page is canonical to the landing page', page.includes("canonical: siteUrl('/')"))
check('the share page tags its visitors', page.includes('source=share-freedom-year'))
const image = readFileSync(new URL('../app/api/og/freedom/route.tsx', import.meta.url), 'utf8')
check('the image reads the validated year', image.includes("parseFreedomYear(searchParams.get('y'))"))
const button = readFileSync(new URL('../app/components/ShareFreedomYear.tsx', import.meta.url), 'utf8')
check('the share event never sends the year', !/trackFreedomYearShared\([^)]*year/.test(button))

const failed = checks.filter((c) => !c.ok)
for (const c of checks) console.log(`${c.ok ? 'ok  ' : 'FAIL'} ${c.name}`)
if (failed.length) { console.error(`\n${failed.length} check(s) failed`); process.exit(1) }
console.log(`\nAll ${checks.length} freedom-share checks passed`)
