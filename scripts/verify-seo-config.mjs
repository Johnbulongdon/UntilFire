import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();
const canonicalHost = 'https://www.untilfire.com';
const legacyHostPattern = /https:\/\/untilfire\.com(?![\w.-])/;

const filesToCheck = [
  'app/layout.tsx',
  'app/sitemap.ts',
  'app/robots.ts',
  'app/fire-calculator/page.tsx',
  'app/calculators/page.tsx',
  'app/calculators/apy/page.tsx',
  'app/calculators/compound-interest/page.tsx',
  'app/calculators/savings-rate/page.tsx',
  'app/calculators/coast-fire/page.tsx',
  'app/calculators/4-percent-rule/page.tsx',
  'app/learn/page.tsx',
  'app/learn/articles/page.tsx',
  'app/learn/topics/page.tsx',
  'app/learn/[slug]/page.tsx',
  'app/learn/stages/[stage]/page.tsx',
  'app/fire-number/page.tsx',
  'app/fire-number/[slug]/page.tsx',
  'app/fire-number/[city]/page.tsx',
  'lib/city-pages.ts',
];

for (const relativePath of filesToCheck) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} must exist`);
  const source = fs.readFileSync(fullPath, 'utf8');
  assert.equal(
    legacyHostPattern.test(source),
    false,
    `${relativePath} still contains legacy apex SEO host https://untilfire.com`,
  );
}

const siteConfig = fs.readFileSync(path.join(repoRoot, 'lib/site.ts'), 'utf8');
assert.match(siteConfig, /SITE_URL\s*=\s*['"]https:\/\/www\.untilfire\.com['"]/, 'SITE_URL must use canonical www host');
assert.match(siteConfig, /siteUrl\(/, 'siteUrl helper should centralize absolute URL generation');

const fireCalculatorSource = fs.readFileSync(path.join(repoRoot, 'app/fire-calculator/page.tsx'), 'utf8');
for (const required of [
  'FIRE calculator',
  'financial independence calculator',
  'retire early calculator',
  'FIRE number calculator',
  'FAQPage',
  'SoftwareApplication',
  '/calculators/4-percent-rule',
  '/calculators/coast-fire',
  '/calculators/savings-rate',
  '/learn/what-is-fire-financial-independence-retire-early',
]) {
  assert.match(fireCalculatorSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `FIRE calculator page missing ${required}`);
}
assert.match(fireCalculatorSource, /canonical:\s*siteUrl\(['"]\/fire-calculator['"]\)/, 'FIRE calculator page needs canonical metadata');

const sitemapSource = fs.readFileSync(path.join(repoRoot, 'app/sitemap.ts'), 'utf8');
assert.match(sitemapSource, /siteUrl\(/, 'sitemap should use siteUrl helper');
assert.match(sitemapSource, /siteUrl\(['"]\/fire-calculator['"]\)/, 'sitemap should include /fire-calculator');

const robotsSource = fs.readFileSync(path.join(repoRoot, 'app/robots.ts'), 'utf8');
assert.match(robotsSource, /siteUrl\(['"]\/sitemap\.xml['"]\)/, 'robots sitemap should use canonical siteUrl helper');

const nextConfig = fs.readFileSync(path.join(repoRoot, 'next.config.js'), 'utf8');
assert.doesNotMatch(nextConfig, /source:\s*['"]\/fire-calculator['"]/, '/fire-calculator should be an indexable landing page, not a redirect');
const requiredRedirectSources = [
  '/fire-number-calculator',
  '/coast-fire-calculator',
  '/barista-fire-calculator',
];

for (const source of requiredRedirectSources) {
  assert.match(nextConfig, new RegExp(`source:\\s*['"]${source}['"]`), `Missing redirect for stale indexed URL ${source}`);
}

console.log('SEO config checks passed');
