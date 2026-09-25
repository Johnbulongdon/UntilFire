import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const source = readFileSync('app/fire-number/[slug]/page.tsx', 'utf8')
const curatedCitySource = readFileSync('lib/city-pages.ts', 'utf8')

assert.match(
  source,
  /FIRE Number Calculator\{['"]\s['"]\}\s*<br \/>for \{data\.name\}/,
  'generic city H1 should include a real text space before the line break so crawlers read “Calculator for …”, not “Calculatorfor …”',
)

assert.match(
  curatedCitySource,
  /searchTitle: 'Singapore FIRE Number: \$1\.8M Estimate \| UntilFire'/,
  'Singapore search metadata should lead with the estimated answer',
)
assert.match(
  curatedCitySource,
  /All amounts are in US dollars|annual spending \(USD\)/i,
  'curated city data should identify the currency used for planning estimates',
)
assert.match(
  source,
  /How spending changes the \{page\.city\.name\} FIRE number/,
  'curated city pages should make the 25x target sensitive to spending assumptions',
)

// The wording changed on purpose in 9908ea5: the title now leads with the
// city's number ("Retire in Seattle: You Need $2.1M"), because the old
// category-shaped title matched every competing result. What must hold is
// that both are specific to the city.
assert.match(
  source,
  /title: `[^`]*\$\{data\.name\}[^`]*\| UntilFire`/,
  'generic city pages should have city-specific title metadata',
)

assert.match(
  source,
  /description: `[^`]*\$\{data\.name\}[^`]*`/,
  'generic city pages should have city-specific meta descriptions',
)

assert.match(
  source,
  /alternates: \{ canonical: `https:\/\/www\.untilfire\.com\/fire-number\/\$\{data\.key\}` \}/,
  'generic city pages should have canonical URLs for their /fire-number/{city} route',
)

assert.match(
  source,
  /href=\{`\/fire-number\/\$\{c\.key\}`\}/,
  'generic city pages should keep crawlable internal links to related city pages',
)

const builtGenericCityPage = '.next/server/app/fire-number/idahofalls.html'
if (existsSync(builtGenericCityPage)) {
  const html = readFileSync(builtGenericCityPage, 'utf8')
  const h1 = html
    .match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  assert.equal(
    h1,
    'FIRE Number Calculator for Idaho Falls, ID',
    'built generic city H1 should be crawler-readable with a space between Calculator and for',
  )
}

const builtSingaporePage = '.next/server/app/fire-number/singapore.html'
if (existsSync(builtSingaporePage)) {
  const html = readFileSync(builtSingaporePage, 'utf8')
  assert.match(html, /<title>Singapore FIRE Number: \$1\.8M Estimate \| UntilFire<\/title>/i)
  for (const expected of [
    'Spending sensitivity',
    'All amounts are in US dollars',
    '$1,350,000',
    '$1,800,000',
    '$2,250,000',
  ]) {
    assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Singapore page missing ${expected}`)
  }
}

console.log('City page SEO checks passed')
