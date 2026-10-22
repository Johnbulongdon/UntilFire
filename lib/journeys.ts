/**
 * The user journeys, step by step, for the admin Journeys tab.
 *
 * Every web step names the page it happens on, and every phone step names its
 * screen file, so `npm run test:journeys` can fail when a step's page is moved
 * or deleted. Screenshots are taken from the `shot` values (see JourneyStep);
 * steps without one (Google, Stripe) are drawn as labelled boxes.
 */

export type Platform = 'web' | 'phone'
export type Visitor = 'new' | 'returning'

export interface JourneyStep {
  /** Short name shown under the screenshot. */
  label: string
  /** What the person does to move on, e.g. "Tap Start". */
  action?: string
  /** Web: the app route (app/…/page.tsx). Phone: the screen file under mobile/src/app. */
  route: string
  /**
   * How the screenshot script reaches this step:
   * - `/path` — open it signed out;
   * - `calc:<name>` — answer the calculator with sample numbers and stop here;
   * - `login:code` — ask for an email code on /login (the request is stubbed, so no email is sent);
   * - `user:/path` — open it signed in as the journeys test account;
   * - `pro:/path` — the same, with the browser told the account has Pro (nothing is saved);
   * - `stripe:checkout`, `stripe:portal` — follow the Pro buttons to Stripe's own page and stop there;
   * - `app:/path`, `app-user:/path` — the same in the phone app's web build, at phone size;
   *   `app:launch` is its launch screen.
   *   `app:/onboarding/<screen>` shots are taken in one walk with sample answers.
   *   `app-tour:<n>` is stop n of the Home tour, shown as on a first visit.
   */
  shot?: string
  /** Signed-in steps only: buttons whose text contains these are pressed, in order, before the screenshot. */
  click?: string[]
  /** Not ours to draw: a Google or Stripe page. */
  external?: boolean
}

export interface Journey {
  id: string
  title: string
  platform: Platform
  visitor: Visitor
  steps: JourneyStep[]
}

/** The calculator questions on the website, in the order HomeClient asks them. */
const WEB_CALCULATOR: JourneyStep[] = [
  { label: 'City', action: 'Pick a city or skip', route: '/', shot: '/?start=onboarding' },
  { label: 'Income', action: 'Enter take-home pay', route: '/', shot: '/?start=onboarding&city=austin' },
  { label: 'Savings', action: 'Enter monthly savings', route: '/', shot: 'calc:savings' },
  { label: 'Invested', action: 'Enter what you have', route: '/', shot: 'calc:portfolio' },
  { label: 'Age', action: 'Enter or skip', route: '/', shot: 'calc:age' },
  // The RevealFlow pages that follow the questions, in order.
  { label: 'Freedom age', action: 'Tap Continue', route: '/', shot: 'calc:freedom-age' },
  { label: 'Life in years', action: 'Tap Continue', route: '/', shot: 'calc:life' },
  { label: 'Freedom number', action: 'Tap Continue', route: '/', shot: 'calc:number' },
  { label: 'How you stack up', action: 'Tap Continue', route: '/', shot: 'calc:standing' },
  { label: 'Expat FIRE', action: 'Tap Try a different pace', route: '/', shot: 'calc:abroad' },
]

/** The calculator pages the screenshot script walks through, in order. */
export const CALC_SHOTS = ['savings', 'portfolio', 'age', 'freedom-age', 'life', 'number', 'standing', 'abroad', 'pace', 'save'] as const

/** The calculator's save step is the sign-up card itself (Google, Apple soon, or email). */
const WEB_SIGN_UP: JourneyStep[] = [
  { label: 'Savings pace', action: 'Keep or update monthly savings', route: '/', shot: 'calc:pace' },
  { label: 'Save and sign up', action: 'Save with Google or email', route: '/', shot: 'calc:save' },
  { label: 'Google', route: '/auth/callback', external: true },
  { label: 'Home', route: '/dashboard', shot: 'user:/dashboard' },
]

/** Phone onboarding after sign-in, in the order the screens push each other. */
const PHONE_ONBOARDING: JourneyStep[] = [
  'goal', 'city', 'pay', 'income', 'know', 'spending', 'invested', 'age',
  'reveal', 'life', 'number', 'standing', 'abroad', 'reminder',
].map((screen) => ({ label: screen[0].toUpperCase() + screen.slice(1), route: `onboarding/${screen}.tsx`, shot: `app:/onboarding/${screen}` }))

/** Website Money and Plan pages; sub-pages without their own URL are opened like a person would, by their tab. */
const WEB_MONEY: JourneyStep[] = [
  { label: 'Transactions', action: 'Tap Calendar', route: '/dashboard', shot: 'user:/dashboard?tab=cashflow' },
  { label: 'Calendar', action: 'Tap Categories', route: '/dashboard', shot: 'user:/dashboard?tab=cashflow', click: ['^Calendar$'] },
  { label: 'Categories', action: 'Tap Budget', route: '/dashboard', shot: 'user:/dashboard?tab=cashflow', click: ['^Categories$'] },
  { label: 'Budget', action: 'Tap Income', route: '/dashboard', shot: 'user:/dashboard?tab=cashflow', click: ['^Budget$'] },
  { label: 'Income', action: 'Tap Net Worth', route: '/dashboard', shot: 'user:/dashboard?tab=income' },
  { label: 'Net Worth', action: 'Tap Debts', route: '/dashboard', shot: 'user:/dashboard?tab=assets' },
  { label: 'Debts', action: 'Tap Insights', route: '/dashboard', shot: 'user:/dashboard?tab=liabilities' },
  { label: 'Insights', route: '/dashboard', shot: 'user:/dashboard?tab=reports' },
]

const WEB_PLAN: JourneyStep[] = [
  { label: 'Freedom Date', action: 'Tap Compare', route: '/dashboard', shot: 'user:/dashboard?tab=fire-calculator' },
  { label: 'Compare', action: 'Tap Scenarios', route: '/dashboard', shot: 'user:/dashboard?tab=fire-calculator', click: ['^Compare$'] },
  { label: 'Scenarios', action: 'Tap Goals', route: '/dashboard', shot: 'user:/dashboard?tab=fire-calculator', click: ['^Scenarios$'] },
  { label: 'Goals', action: 'Tap Contributions', route: '/dashboard', shot: 'user:/dashboard?tab=goals' },
  { label: 'Contributions', action: 'Tap Explore', route: '/dashboard', shot: 'user:/dashboard?tab=contributions' },
  { label: 'Explore', action: 'Tap Citizenship', route: '/dashboard', shot: 'user:/dashboard?tab=expat-fire' },
  { label: 'Citizenship', action: 'Tap Learn', route: '/dashboard', shot: 'user:/dashboard?tab=citizenship' },
  { label: 'Learn', route: '/dashboard', shot: 'user:/dashboard?tab=learning-hub' },
]

/** TourModal, opened from the sidebar's Take a tour (computer size only). */
const WEB_TOUR: JourneyStep[] = ['Welcome', 'Home', 'Money', 'Plan', 'Profile'].map((label, i) => ({
  label: `Tour: ${label}`, action: i ? 'Tap Next' : 'Tap Start Tour', route: '/dashboard', shot: 'user:/dashboard',
  click: ['Take a tour', ...(i ? ['Start Tour'] : []), ...Array(Math.max(0, i - 1)).fill('Next →')],
}))

/** Phone tabs and pages, as each screen file names them. */
const phoneScreens = (screens: [string, string][]): JourneyStep[] => screens.map(([label, file], i) => ({
  label, ...(i < screens.length - 1 ? { action: `Tap ${screens[i + 1][0]}` } : {}),
  route: `${file}.tsx`, shot: `app-user:/${file.replace(/^\(tabs\)\//, '').replace(/\/?index$/, '')}`,
}))
const PHONE_MONEY = phoneScreens([
  ['Money', '(tabs)/money/index'], ['Transactions', '(tabs)/money/transactions'], ['Calendar', '(tabs)/money/calendar'],
  ['Budget', '(tabs)/money/budget'], ['Income', '(tabs)/money/income'], ['Net worth', '(tabs)/money/net-worth'],
  ['Insights', '(tabs)/money/insights'],
])
const PHONE_PLAN = phoneScreens([
  ['Plan', '(tabs)/plan/index'], ['Freedom date', '(tabs)/plan/freedom'], ['What if', '(tabs)/plan/what-if'],
  ['Compare', '(tabs)/plan/compare'], ['Scenarios', '(tabs)/plan/scenarios'], ['Goals', '(tabs)/plan/goals'],
  ['Contributions', '(tabs)/plan/contributions'], ['Explore', '(tabs)/plan/explore'],
  ['Citizenship', '(tabs)/plan/citizenship'], ['Learn', '(tabs)/plan/learn'],
])
const PHONE_PROFILE = phoneScreens([
  ['Household', 'household'], ['Currency', 'currency'], ['Name', 'name'], ['FIRE type', 'fire-quiz'],
  ['Give a month', 'give-a-month'], ["What's new", 'update-log'], ['Feedback', 'feedback'], ['Import', 'import'],
])
/** GuidedTour's four stops on Home. */
const PHONE_TOUR: JourneyStep[] = ['Freedom date', 'Quick moves', 'Today', 'Tabs'].map((label, i) => ({
  label: `Tour: ${label}`, action: i < 3 ? 'Tap Next' : 'Tap Got it', route: '(tabs)/index.tsx', shot: `app-tour:${i + 1}`,
}))

const WEB_HOME: JourneyStep = { label: 'Home', action: 'Open a page', route: '/dashboard', shot: 'user:/dashboard' }
const PHONE_HOME: JourneyStep = { label: 'Home', action: 'Open a tab', route: '(tabs)/index.tsx', shot: 'app-user:/' }

export const JOURNEYS: Journey[] = [
  {
    id: 'web-landing', title: 'Landing → plan → sign up', platform: 'web', visitor: 'new',
    steps: [{ label: 'Landing', action: 'Tap Get started', route: '/', shot: '/' }, ...WEB_CALCULATOR, ...WEB_SIGN_UP],
  },
  {
    id: 'web-fire-number', title: 'FIRE number page → plan', platform: 'web', visitor: 'new',
    steps: [
      { label: 'FIRE number', action: 'Tap Start free', route: '/fire-number', shot: '/fire-number' },
      ...WEB_CALCULATOR, ...WEB_SIGN_UP,
    ],
  },
  {
    id: 'web-city-guide', title: 'City guide → plan', platform: 'web', visitor: 'new',
    steps: [
      { label: 'City guide', action: 'Tap Build my plan', route: '/fire-number/[slug]', shot: '/fire-number/austin' },
      ...WEB_CALCULATOR.slice(1), ...WEB_SIGN_UP,
    ],
  },
  {
    id: 'web-fire-type', title: 'FIRE Type quiz → plan', platform: 'web', visitor: 'new',
    steps: [
      { label: 'FIRE Type', action: 'Answer, then Start', route: '/fire-type', shot: '/fire-type' },
      ...WEB_CALCULATOR, ...WEB_SIGN_UP,
    ],
  },
  {
    id: 'web-pricing', title: 'Pricing → plan', platform: 'web', visitor: 'new',
    steps: [{ label: 'Pricing', action: 'Tap Get started free', route: '/pricing', shot: '/pricing' }, ...WEB_CALCULATOR, ...WEB_SIGN_UP],
  },
  {
    id: 'web-returning', title: 'Coming back', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Landing', action: 'Signed in: sent on', route: '/', shot: '/' },
      { label: 'Home', route: '/dashboard', shot: 'user:/dashboard' },
    ],
  },
  {
    id: 'web-email-login', title: 'Log in with email', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Log in', action: 'Enter email', route: '/login', shot: '/login' },
      { label: 'Code', action: 'Enter the 6-digit code', route: '/login', shot: 'login:code' },
      { label: 'Home', route: '/dashboard', shot: 'user:/dashboard' },
    ],
  },
  {
    id: 'web-subscribe', title: 'Start Pro', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Try Pro', route: '/dashboard', shot: 'user:/dashboard?tab=profile' },
      { label: 'Upgrade', action: 'Pick a plan', route: '/dashboard', shot: 'user:/dashboard?tab=profile', click: ['Try Pro'] },
      { label: 'Stripe checkout', route: '/api/stripe/checkout', shot: 'stripe:checkout', external: true },
      { label: 'Home, Pro on', route: '/dashboard', shot: 'pro:/dashboard' },
    ],
  },
  {
    id: 'web-delete', title: 'Delete account', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Data and account', route: '/dashboard', shot: 'user:/dashboard?tab=profile' },
      { label: 'Data and account', action: 'Tap Delete account…', route: '/dashboard', shot: 'user:/dashboard?tab=profile', click: ['Data and account'] },
      // Only opens the confirm box: the script never types the email or deletes.
      { label: 'Confirm', action: 'Type email, delete', route: '/dashboard', shot: 'user:/dashboard?tab=profile', click: ['Data and account', 'Delete account'] },
      { label: 'Landing', route: '/', shot: '/' },
    ],
  },
  {
    id: 'web-cancel', title: 'Cancel Pro', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Cancel Pro', route: '/dashboard', shot: 'pro:/dashboard?tab=profile' },
      { label: 'What changed?', action: 'Pick one reason', route: '/dashboard', shot: 'pro:/dashboard?tab=profile', click: ['Cancel Pro'] },
      { label: 'What you keep', action: 'Tap Cancel Pro', route: '/api/stripe/cancel', shot: 'pro:/dashboard?tab=profile', click: ['Cancel Pro', "I'm taking a break"] },
      { label: 'Goodbye', action: 'Tap Back to Profile', route: '/dashboard', shot: 'pro:/dashboard?tab=profile', click: ['Cancel Pro', 'Skip and cancel Pro'] },
      { label: 'Profile, Pro ending', action: 'Tap Keep Pro to undo', route: '/dashboard', shot: 'pro:/dashboard?tab=profile', click: ['Cancel Pro', 'Skip and cancel Pro', 'Back to Profile'] },
    ],
  },
  {
    id: 'web-billing', title: 'Invoices and card', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Invoices and card', route: '/dashboard', shot: 'pro:/dashboard?tab=profile' },
      { label: 'Stripe portal', route: '/api/stripe/portal', shot: 'stripe:portal', external: true },
    ],
  },
  { id: 'web-tour', title: 'Home tour', platform: 'web', visitor: 'new', steps: [WEB_HOME, ...WEB_TOUR] },
  { id: 'web-money', title: 'Look around: Money', platform: 'web', visitor: 'returning', steps: [WEB_HOME, ...WEB_MONEY] },
  { id: 'web-plan', title: 'Look around: Plan', platform: 'web', visitor: 'returning', steps: [WEB_HOME, ...WEB_PLAN] },
  {
    id: 'phone-new', title: 'Phone: sign in, then onboarding', platform: 'phone', visitor: 'new',
    steps: [
      { label: 'Welcome', action: 'Tap Get started', route: 'onboarding/index.tsx', shot: 'app:/onboarding' },
      { label: 'Sign in', action: 'Google or email', route: 'sign-in.tsx', shot: 'app:/sign-in' },
      ...PHONE_ONBOARDING,
      { label: 'Home', route: '(tabs)/index.tsx', shot: 'app-user:/' },
    ],
  },
  {
    id: 'phone-returning', title: 'Phone: coming back', platform: 'phone', visitor: 'returning',
    steps: [
      // index.tsx draws nothing: what shows is the launch screen (app.json splash).
      { label: 'Open app', action: 'Plan saved: sent on', route: 'index.tsx', shot: 'app:launch' },
      { label: 'Home', route: '(tabs)/index.tsx', shot: 'app-user:/' },
    ],
  },
  {
    id: 'phone-pro', title: 'Phone: Pro', platform: 'phone', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap UntilFire Pro', route: '(tabs)/profile.tsx', shot: 'app-user:/profile' },
      { label: 'Pro', action: 'Subscribe or manage', route: 'pro.tsx', shot: 'app-user:/pro' },
    ],
  },
  {
    id: 'phone-delete', title: 'Phone: delete account', platform: 'phone', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Data and account', route: '(tabs)/profile.tsx', shot: 'app-user:/profile' },
      { label: 'Data and account', action: 'Tap Delete account', route: 'data-account.tsx', shot: 'app-user:/data-account' },
      // Opening the screen deletes nothing: it waits for the email to be typed.
      { label: 'Delete', action: 'Confirm', route: 'delete-account.tsx', shot: 'app-user:/delete-account' },
      { label: 'Welcome', route: 'onboarding/index.tsx', shot: 'app:/onboarding' },
    ],
  },
  { id: 'phone-tour', title: 'Phone: Home tour', platform: 'phone', visitor: 'new', steps: [PHONE_HOME, ...PHONE_TOUR] },
  { id: 'phone-money', title: 'Phone: look around Money', platform: 'phone', visitor: 'returning', steps: [PHONE_HOME, ...PHONE_MONEY] },
  { id: 'phone-plan', title: 'Phone: look around Plan', platform: 'phone', visitor: 'returning', steps: [PHONE_HOME, ...PHONE_PLAN] },
  {
    id: 'phone-profile', title: 'Phone: Profile pages', platform: 'phone', visitor: 'returning',
    steps: [{ label: 'Profile', action: 'Open a row', route: '(tabs)/profile.tsx', shot: 'app-user:/profile' }, ...PHONE_PROFILE],
  },
]

export type ShotDevice = 'desktop' | 'phone'

/** Screen sizes the screenshot script uses; the admin tab shows the same two. */
export const SHOT_VIEWPORTS: Record<ShotDevice, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
}

/** Public Supabase Storage bucket the screenshots are uploaded to. */
export const SHOT_BUCKET = 'journeys'

/** Phone app shots exist only at phone size; the website tour opens only from the computer-size sidebar. */
export const shotDevice = (shot: string, device: ShotDevice, click?: string[]): ShotDevice =>
  shot.startsWith('app') ? 'phone' : click?.[0] === 'Take a tour' ? 'desktop' : device

/** One file per URL and size, so a step shared by several journeys is taken once. */
export function shotFile(shot: string, device: ShotDevice, click?: string[]): string {
  const slug = [shot, ...(click ?? [])].join('-').replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'landing'
  return `${slug}-${device}.png`
}
