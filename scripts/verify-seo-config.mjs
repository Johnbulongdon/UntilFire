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

const landingSource = fs.readFileSync(path.join(repoRoot, 'app/page.tsx'), 'utf8');
const heroSource = fs.readFileSync(path.join(repoRoot, 'app/components/landing/HeroScreen.tsx'), 'utf8');

assert.match(heroSource, /Find my freedom date/i, 'Homepage primary CTA should lead with freedom date, not FIRE number');
assert.doesNotMatch(heroSource, /Find my FIRE number/i, 'Homepage hero CTA should not say Find my FIRE number');
assert.doesNotMatch(heroSource, />\s*Log in/i, 'Homepage hero should not show a secondary Log in CTA beside the no-login start button');
assert.match(heroSource, /fire-type\?source=homepage-secondary/i, 'Homepage hero should offer the FIRE Type personality test next to the primary CTA');
assert.match(heroSource, /uf-hero-ctas[^]*uf-btn-power[^]*fire-type\?source=homepage-secondary/i, 'FIRE Type quiz should sit in the hero CTA row, not below it');

assert.match(landingSource, /Earn 10% more/i, 'Decision-impact cards should keep the pay lever positive');
assert.doesNotMatch(landingSource, /Take a 10% pay cut/i, 'Decision-impact cards should not show confusing pay-cut acceleration copy');
assert.match(landingSource, /initialPortfolioBalance/i, 'Adjust Inputs should preserve portfolio value when returning to the portfolio step');
assert.match(landingSource, /initialAge/i, 'Adjust Inputs should preserve current age when returning to the portfolio step');
assert.match(landingSource, /uf-mobile-primary-action/i, 'Mobile CSS should prioritize the primary action on small screens');
assert.match(landingSource, /@media\(max-width:\s*480px\)[^]*uf-hero-ctas[^]*grid-template-columns:\s*1fr/i, 'Mobile hero CTAs should stack cleanly on narrow screens');

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
