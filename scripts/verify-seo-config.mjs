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

const sitemapSource = fs.readFileSync(path.join(repoRoot, 'app/sitemap.ts'), 'utf8');
assert.match(sitemapSource, /siteUrl\(/, 'sitemap should use siteUrl helper');

const robotsSource = fs.readFileSync(path.join(repoRoot, 'app/robots.ts'), 'utf8');
assert.match(robotsSource, /siteUrl\(['"]\/sitemap\.xml['"]\)/, 'robots sitemap should use canonical siteUrl helper');

const nextConfig = fs.readFileSync(path.join(repoRoot, 'next.config.js'), 'utf8');
const requiredRedirectSources = [
  '/fire-calculator',
  '/fire-number-calculator',
  '/coast-fire-calculator',
  '/barista-fire-calculator',
];

for (const source of requiredRedirectSources) {
  assert.match(nextConfig, new RegExp(`source:\\s*['"]${source}['"]`), `Missing redirect for stale indexed URL ${source}`);
}

console.log('SEO config checks passed');
