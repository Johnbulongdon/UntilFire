import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'

const source = readFileSync('app/fire-number/[slug]/page.tsx', 'utf8')
const fireDataSource = readFileSync('lib/fire-data.ts', 'utf8')
const curatedCitySource = readFileSync('lib/city-pages.ts', 'utf8')
const nextConfigSource = readFileSync('next.config.js', 'utf8')
const sitemapSource = readFileSync('app/sitemap.ts', 'utf8')
const austinSeed = curatedCitySource.match(/\{\s*slug: 'austin-tx',[\s\S]*?\n  \},/)?.[0]
const singaporeSeed = curatedCitySource.match(/\{\s*slug: 'singapore',[\s\S]*?\n  \},/)?.[0]

assert.ok(austinSeed, 'Austin curated-city seed should exist')
assert.ok(singaporeSeed, 'Singapore curated-city seed should exist')

assert.match(
  nextConfigSource,
  /source: '\/fire-number\/austin',[\s\S]*?destination: '\/fire-number\/austin-tx',[\s\S]*?permanent: true/,
  'the legacy Austin route should permanently redirect to the state-qualified canonical route',
)
assert.match(
  sitemapSource,
  /const curatedCityKeys = new Set\(cityLandingPages\.map\(\(page\) => page\.city\.key\)\)/,
  'the sitemap should identify curated pages by their underlying city key',
)
assert.match(
  sitemapSource,
  /!curatedCityKeys\.has\(city\.key\)/,
  'the sitemap should omit generic aliases for curated city pages',
)

// City links go through cityPagePath, so a curated guide at a different slug
// (Austin is austin-tx) is linked directly, not through its redirect.
assert.match(
  curatedCitySource,
  /export function cityPagePath\(cityKey: string\)[\s\S]*?curatedSlugByCityKey\.get\(cityKey\) \?\? cityKey/,
  'cityPagePath should map a curated city key to its slug',
)
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = `${dir}/${name}`
  return statSync(path).isDirectory() ? walk(path) : /\.tsx?$/.test(name) ? [path] : []
})
const keyLinks = [...walk('app'), ...walk('components')]
  .filter((file) => !file.endsWith('app/sitemap.ts'))
  .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/href=\{`\/fire-number\/\$\{[\w.]*key\}`\}/g)].map((m) => `${file}: ${m[0]}`))
assert.deepEqual(keyLinks, [], 'city links should use cityPagePath(key), not /fire-number/${key}')

assert.match(
  source,
  /FIRE Number Calculator\{['"]\s['"]\}\s*<br \/>for \{data\.name\}/,
  'generic city H1 should include a real text space before the line break so crawlers read “Calculator for …”, not “Calculatorfor …”',
)

assert.match(
  austinSeed,
  /searchTitle: 'Austin FIRE Number: \$1\.36M Estimate \| UntilFire'/,
  'Austin search metadata should lead with the estimated answer',
)
assert.match(
  austinSeed,
  /currencyCode: 'USD'/,
  'Austin should identify the currency used for its planning estimates',
)
assert.doesNotMatch(
  singaporeSeed,
  /currencyCode: 'USD'/,
  'Singapore should not be presented as a USD-targeted search experiment',
)
assert.match(
  source,
  /How spending changes the \{page\.city\.name\} FIRE number/,
  'the USD curated-city experiment should make the 25x target sensitive to spending assumptions',
)
assert.match(
  source,
  /\['Scenario', '25x FIRE target \(USD\)', 'Annual spending \(USD\)', 'Monthly spending \(USD\)'\]/,
  'the spending table should put the FIRE target right after the scenario, so it shows on a phone without scrolling',
)
assert.match(
  source,
  /\[scenario\.annual \* 25, scenario\.annual, scenario\.annual \/ 12\]/,
  'the spending table cells should follow the same column order as its headings',
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
  /href=\{cityPagePath\(c\.key\)\}/,
  'generic city pages should keep crawlable internal links to related city pages',
)

assert.match(
  fireDataSource,
  /export const US_CITY_COST_DATA_UPDATED = 'September 17, 2026'/,
  'US city cost estimates should expose their last reviewed date',
)
for (const expected of [
  'How the {data.name} estimate is built',
  'All amounts are annual US dollars',
  'American Community Survey median gross rent for recent movers',
  'Non-housing spending uses a {formatMoney(34_000)}',
  'https://api.census.gov/data/2024/acs/acs5/groups/B25113.html',
  'https://api.census.gov/data/2024/acs/acs5/groups/B25064.html',
  'href="/calculators/4-percent-rule"',
  'href={statePageHref}',
]) {
  assert.ok(source.includes(expected), `generic US city methodology missing: ${expected}`)
}

const builtGenericCityPage = '.next/server/app/fire-number/idahofalls.html'
if (existsSync(builtGenericCityPage)) {
  const html = readFileSync(builtGenericCityPage, 'utf8')
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
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
  for (const expected of [
    'How the Idaho Falls, ID estimate is built',
    'Updated September 17, 2026',
    'All amounts are annual US dollars',
    'Census recent-mover rent table',
    'Census all-renter fallback table',
    'Test the 25× assumption',
    'Compare FIRE costs across Idaho',
  ]) {
    assert.ok(visibleText.includes(expected), `built generic city page missing ${expected}`)
  }
}

const builtAustinPage = '.next/server/app/fire-number/austin-tx.html'
if (existsSync(builtAustinPage)) {
  const html = readFileSync(builtAustinPage, 'utf8')
  assert.match(html, /<title>Austin FIRE Number: \$1\.36M Estimate \| UntilFire<\/title>/i)
  for (const expected of [
    'Spending sensitivity',
    'All amounts are in US dollars',
    '$1,018,125',
    '$1,357,500',
    '$1,696,875',
    'Dallas, TX',
    'Houston, TX',
    'San Antonio, TX',
    'Fort Worth, TX',
  ]) {
    assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Austin page missing ${expected}`)
  }
  assert.doesNotMatch(html, /Compare nearby FIRE planning paths/)
  assert.doesNotMatch(html, /FIRE NUMBER SINGAPORE/)
}

const builtSingaporePage = '.next/server/app/fire-number/singapore.html'
if (existsSync(builtSingaporePage)) {
  const html = readFileSync(builtSingaporePage, 'utf8')
  assert.doesNotMatch(html, /Spending sensitivity/)
  assert.doesNotMatch(html, /All amounts are in US dollars/)
}

console.log('City page SEO checks passed')
