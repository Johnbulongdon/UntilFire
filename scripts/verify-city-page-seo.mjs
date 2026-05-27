import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const source = readFileSync('app/fire-number/[slug]/page.tsx', 'utf8')

assert.match(
  source,
  /FIRE Number Calculator\{['"]\s['"]\}\s*<br \/>for \{data\.name\}/,
  'generic city H1 should include a real text space before the line break so crawlers read “Calculator for …”, not “Calculatorfor …”',
)

assert.match(
  source,
  /title: `\$\{data\.name\} FIRE Number Calculator \| UntilFire`/,
  'generic city pages should have city-specific title metadata',
)

assert.match(
  source,
  /description: `How much do you need to retire in \$\{data\.name\}\?/,
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

console.log('City page SEO checks passed')
