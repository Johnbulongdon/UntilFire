/**
 * The user journeys, step by step, for the admin Journeys tab.
 *
 * Every web step names the page it happens on, and every phone step names its
 * screen file, so `npm run test:journeys` can fail when a step's page is moved
 * or deleted. Screenshots are taken from the `shot` URLs; steps without one
 * (Google, Stripe, the phone app) are drawn as labelled boxes.
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
  /** A signed-out URL the screenshot script can open, when there is one. */
  shot?: string
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
  { label: 'Savings', action: 'Enter monthly savings', route: '/' },
  { label: 'Invested', action: 'Enter what you have', route: '/' },
  { label: 'Age', action: 'Enter or skip', route: '/' },
  { label: 'Freedom date', action: 'Tap Save my plan', route: '/' },
]

const WEB_SIGN_UP: JourneyStep[] = [
  { label: 'Sign up', action: 'Continue with Google', route: '/login', shot: '/login' },
  { label: 'Google', route: '/auth/callback', external: true },
  { label: 'Home', route: '/dashboard' },
]

/** Phone onboarding after sign-in, in the order the screens push each other. */
const PHONE_ONBOARDING: JourneyStep[] = [
  'goal', 'city', 'pay', 'income', 'know', 'spending', 'invested', 'age',
  'reveal', 'life', 'number', 'standing', 'abroad', 'reminder',
].map((screen) => ({ label: screen[0].toUpperCase() + screen.slice(1), route: `onboarding/${screen}.tsx` }))

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
      { label: 'Landing', action: 'Signed in: sent on', route: '/' },
      { label: 'Home', route: '/dashboard' },
    ],
  },
  {
    id: 'web-email-login', title: 'Log in with email', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Log in', action: 'Tap Use email instead', route: '/login', shot: '/login' },
      { label: 'Code', action: 'Enter the 6-digit code', route: '/login' },
      { label: 'Home', route: '/dashboard' },
    ],
  },
  {
    id: 'web-subscribe', title: 'Start Pro', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Try Pro', route: '/dashboard' },
      { label: 'Upgrade', action: 'Pick a plan', route: '/dashboard' },
      { label: 'Stripe checkout', route: '/api/stripe/checkout', external: true },
      { label: 'Home, Pro on', route: '/dashboard' },
    ],
  },
  {
    id: 'web-cancel', title: 'Cancel Pro', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Manage billing', route: '/dashboard' },
      { label: 'Stripe portal', action: 'Cancel plan', route: '/api/stripe/portal', external: true },
      { label: 'Home', route: '/dashboard' },
    ],
  },
  {
    id: 'web-delete', title: 'Delete account', platform: 'web', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Delete account…', route: '/dashboard' },
      { label: 'Confirm', action: 'Type email, delete', route: '/dashboard' },
      { label: 'Landing', route: '/' },
    ],
  },
  {
    id: 'phone-new', title: 'Phone: sign in, then onboarding', platform: 'phone', visitor: 'new',
    steps: [
      { label: 'Welcome', action: 'Tap Get started', route: 'onboarding/index.tsx' },
      { label: 'Sign in', action: 'Google or email', route: 'sign-in.tsx' },
      ...PHONE_ONBOARDING,
      { label: 'Home', route: '(tabs)/index.tsx' },
    ],
  },
  {
    id: 'phone-returning', title: 'Phone: coming back', platform: 'phone', visitor: 'returning',
    steps: [
      { label: 'Open app', action: 'Plan saved: sent on', route: 'index.tsx' },
      { label: 'Home', route: '(tabs)/index.tsx' },
    ],
  },
  {
    id: 'phone-pro', title: 'Phone: Pro', platform: 'phone', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap UntilFire Pro', route: '(tabs)/profile.tsx' },
      { label: 'Pro', action: 'Subscribe or manage', route: 'pro.tsx' },
    ],
  },
  {
    id: 'phone-delete', title: 'Phone: delete account', platform: 'phone', visitor: 'returning',
    steps: [
      { label: 'Profile', action: 'Tap Data and account', route: '(tabs)/profile.tsx' },
      { label: 'Data and account', action: 'Tap Delete account', route: 'data-account.tsx' },
      { label: 'Delete', action: 'Confirm', route: 'delete-account.tsx' },
      { label: 'Welcome', route: 'onboarding/index.tsx' },
    ],
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

/** One file per URL and size, so a step shared by several journeys is taken once. */
export function shotFile(shot: string, device: ShotDevice): string {
  const slug = shot.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'landing'
  return `${slug}-${device}.png`
}
