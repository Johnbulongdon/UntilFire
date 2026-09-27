import assert from 'node:assert/strict'
import { acquisitionSourceFromVisit, normaliseAcquisitionSource } from '../lib/acquisition.ts'

const visit = (url: string, referrer?: string) =>
  acquisitionSourceFromVisit(new URL(url), referrer)

assert.equal(visit('https://www.untilfire.com/?source=best-states'), 'best-states')
assert.equal(
  visit('https://www.untilfire.com/?utm_source=twitter&utm_medium=organic_social'),
  'utm-twitter-organic_social',
)
assert.equal(
  visit('https://www.untilfire.com/fire-number/austin-tx', 'https://www.google.com/search?q=private'),
  'organic-google',
)
assert.equal(
  visit('https://www.untilfire.com/calculators/savings-rate', 'https://www.bing.com/search?q=private'),
  'organic-bing',
)
assert.equal(
  visit('https://www.untilfire.com/', 'https://newsletter.example.com/issue/12?email=private'),
  'referral-newsletter-example-com',
)
assert.equal(
  visit('https://www.untilfire.com/fire-number/austin-tx', 'https://untilfire.com/calculators'),
  undefined,
)
assert.equal(visit('https://www.untilfire.com/'), undefined)
assert.equal(normaliseAcquisitionSource('  Organic Google!  '), 'organic-google')

console.log('Acquisition source ok: explicit, UTM, organic and referral visits are attributed without storing queries.')
