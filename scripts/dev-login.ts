import fs from 'node:fs'
import path from 'node:path'

import { appAuthKey, botSession, BOT_EMAIL, SITE_AUTH_KEY } from './journeys-bot.ts'

// Signs local agents (Claude Code, Codex) past the login on this computer, the
// way the Journeys capture does: it mints a session for the journeys test
// account and saves it for the local website and the phone's web build.
//   npm run dev:login                      writes .dev-login/ (git-ignored)
//   npm run dev:login -- --open            also opens a signed-in Chromium on the website
//   npm run dev:login -- --site http://localhost:3001 --app http://localhost:8082
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local. Only ever
// writes sessions for localhost addresses.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** KEY=value lines from the git-ignored env files; the real environment wins. */
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (!match || process.env[match[1]] !== undefined) continue
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function localOrigin(label: string, value: string) {
  let url: URL
  try { url = new URL(value) } catch { fail(`${label} is not a web address: ${value}`) }
  if (!LOCAL_HOSTS.has(url.hostname) && !url.hostname.endsWith('.localhost')) {
    fail(`${label} must be on this computer (localhost), not ${url.hostname}. dev:login never signs in anywhere else.`)
  }
  return url.origin
}

function fail(message: string): never {
  console.error(`dev:login: ${message}`)
  process.exit(1)
}

loadEnv()
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) fail('add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local (see AGENTS.md, "Signing in locally").')
const siteSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
if (siteSupabase && siteSupabase !== supabaseUrl) {
  console.warn(`dev:login: the website uses ${siteSupabase} but SUPABASE_URL is ${supabaseUrl}; the session only works on the matching project.`)
}

const site = localOrigin('--site', arg('site', 'http://localhost:3000'))
const app = localOrigin('--app', arg('app', 'http://localhost:8081'))

const session = JSON.stringify(await botSession(supabaseUrl, serviceKey))
// GuidedTour's seen flag (AsyncStorage is localStorage on web), so Home shows without the tour.
const storage: Record<string, Record<string, string>> = {
  [site]: { [SITE_AUTH_KEY]: session },
  [app]: { [appAuthKey(supabaseUrl)]: session, 'tour-seen': '1' },
}

const dir = path.resolve('.dev-login')
fs.mkdirSync(dir, { recursive: true })
// Playwright's storageState: newContext({ storageState: '.dev-login/storage-state.json' }).
const statePath = path.join(dir, 'storage-state.json')
fs.writeFileSync(statePath, JSON.stringify({
  cookies: [],
  origins: Object.entries(storage).map(([origin, items]) => ({
    origin,
    localStorage: Object.entries(items).map(([name, value]) => ({ name, value })),
  })),
}, null, 2))
// For a browser an agent can only run JavaScript in: run on the local page, then reload.
const snippetPath = path.join(dir, 'sign-in.js')
fs.writeFileSync(snippetPath, `(() => {
  const storage = ${JSON.stringify(storage)}
  const items = storage[location.origin]
  if (!items) throw new Error('dev:login has no session for ' + location.origin)
  for (const [key, value] of Object.entries(items)) localStorage.setItem(key, value)
  location.reload()
})()
`)

console.log(`Signed in as ${BOT_EMAIL} for ${site} (website) and ${app} (phone web build).`)
console.log(`  Playwright: ${path.relative(process.cwd(), statePath)}`)
console.log(`  Any other browser: run ${path.relative(process.cwd(), snippetPath)} on the local page`)

if (process.argv.includes('--open')) {
  // Not a project dependency; the Journeys workflow installs it the same way.
  const { chromium } = await import('playwright').catch(() => fail('--open needs Playwright: npm install --no-save playwright@1.56.1 && npx playwright install chromium'))
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ storageState: statePath })
  const page = await context.newPage()
  await page.goto(`${site}/dashboard`)
  console.log('Opened the dashboard. Close the window to finish.')
  await new Promise((resolve) => browser.on('disconnected', resolve))
}
