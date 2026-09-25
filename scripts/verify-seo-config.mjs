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
  'app/fire-number/CityCalcWidget.tsx',
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

// FAQ structured data belongs to the page that shows the questions. The layout
// once carried a site-wide FAQPage that appeared on every page, invisible and
// duplicating each page's own; the homepage builds its schema from homeFaqs.
assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, 'app/layout.tsx'), 'utf8'), /FAQPage/, 'app/layout.tsx must not carry FAQPage schema; it would repeat on every page');
assert.match(fs.readFileSync(path.join(repoRoot, 'app/page.tsx'), 'utf8'), /'FAQPage',\s*mainEntity:\s*homeFaqs\.map/, 'Homepage FAQPage schema should be generated from the visible homeFaqs');

// The landing flow moved from app/page.tsx into app/HomeClient.tsx when the
// homepage was split into a server shell and a client flow (15d5a49), so the
// checks below read both.
const landingSource = ['app/page.tsx', 'app/HomeClient.tsx']
  .map((file) => fs.readFileSync(path.join(repoRoot, file), 'utf8'))
  .join('\n');
// The hero that renders is AnimatedHero, inside LandingPage. HeroScreen.tsx,
// which these checks used to read, has not been rendered since the landing
// page replaced it (274a215), so checks on it passed whatever the homepage
// showed. Confirm the render path first, so that cannot happen silently again.
const landingPageSource = fs.readFileSync(path.join(repoRoot, 'app/components/landing/LandingPage.tsx'), 'utf8');
const heroSource = fs.readFileSync(path.join(repoRoot, 'app/components/landing/AnimatedHero.tsx'), 'utf8');
assert.match(fs.readFileSync(path.join(repoRoot, 'app/HomeClient.tsx'), 'utf8'), /<LandingPage onStart=/, 'Homepage should render LandingPage');
assert.match(landingPageSource, /<AnimatedHero onStart=\{onStart\}/, 'LandingPage should render AnimatedHero as its hero');
const heroCtaRow = heroSource.match(/<div className="hero-cta">[^]*?<\/div>/)?.[0] ?? '';

assert.match(heroCtaRow, /Find my freedom date/i, 'Homepage primary CTA should lead with freedom date, not FIRE number');
assert.doesNotMatch(heroSource, /Find my FIRE number/i, 'Homepage hero CTA should not say Find my FIRE number');
assert.doesNotMatch(heroSource, />\s*Log in/i, 'Homepage hero should not show a secondary Log in CTA beside the no-login start button');
assert.match(heroCtaRow, /onClick=\{onStart\}/, 'The hero CTA should start the no-login calculator');

// The decision-impact cards were removed on purpose (97ea213, "remove decision
// impact"). If they come back, the pay lever must still be the positive one.
if (/Decision impact/i.test(landingSource)) {
  assert.match(landingSource, /Earn 10% more/i, 'Decision-impact cards should keep the pay lever positive');
}
assert.doesNotMatch(landingSource, /Take a 10% pay cut/i, 'Decision-impact cards should not show confusing pay-cut acceleration copy');
assert.match(landingSource, /initialPortfolioBalance/i, 'Adjust Inputs should preserve portfolio value when returning to the portfolio step');
assert.match(landingSource, /initialAge/i, 'Adjust Inputs should preserve current age when returning to the portfolio step');
// The live hero's narrow-screen rule: the primary action fills the row.
assert.match(heroSource, /@container\(max-width:700px\)\{(?:[^{}]*\{[^{}]*\})*?[^{}]*\.uf-motion \.hero-cta>button\{flex:1/i, 'Mobile CSS should prioritize the primary action on small screens');

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
assert.match(sitemapSource, /CITIES,\s*isUS/, 'sitemap should import CITIES and isUS so generated city pages are discoverable');
assert.match(sitemapSource, /isUS\(city\.state\)/, 'sitemap should include all indexable US city FIRE number pages');
assert.match(sitemapSource, /curatedCitySlugs/, 'sitemap should de-duplicate curated city landing pages from generic city routes');
assert.match(sitemapSource, /\/fire-number\/\$\{city\.key\}/, 'sitemap should generate /fire-number/{city} URLs for city keys');

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

// The FIRE Type quiz link sits in the hero CTA row, secondary to the start
// button (D-13). It was lost in the landing redesign (274a215) and restored.
assert.match(heroCtaRow, /fire-type\?source=homepage-secondary/i, 'Homepage hero should offer the FIRE Type personality test next to the primary CTA');
assert.ok(heroCtaRow.indexOf('onClick={onStart}') < heroCtaRow.indexOf('fire-type?source=homepage-secondary'), 'The freedom-date start button comes first; the quiz is the secondary action');

console.log('SEO config checks passed');
