import * as Application from 'expo-application'
import * as Updates from 'expo-updates'

/**
 * What changed in each phone release, newest first, shown under Profile ›
 * Version. Add an entry with every App Store build or quick-fix update; keep
 * each line short and in plain words (the founder reads it to check a build).
 */
export const UPDATE_LOG: { version: string; date: string; changes: string[] }[] = [
  { version: '0.2.1', date: '2026-10-31', changes: ['Transactions are colour-coded: green money in, red money out, blue transfers'] },
  { version: '0.2.1', date: '2026-10-31', changes: ['Clearer category badges, softer Plan chart colours and a flatter Today action'] },
  { version: '0.2.1', date: '2026-10-31', changes: ['A clearer welcome screen previews your money today and freedom ahead'] },
  { version: '0.2.1', date: '2026-10-31', changes: ['Lighter colourful tiles across Money, Plan and Profile, with clearer icons in dark mode'] },
  { version: '0.2.1', date: '2026-10-31', changes: ['Until payday now includes estimated everyday costs, with a simpler bill list and an optional cushion'] },
  { version: '0.2.1', date: '2026-10-29', changes: ['Browse every upcoming bill directly on the payday chart, with details above your finger', 'Categories now use lighter colors that match Home', 'A new yellow horizon logo, clearer type and colourful cards across the app', 'See your plan before signing up, with monthly amounts and one question at a time'] },
  { version: '0.2.0', date: '2026-10-27', changes: ['The welcome screen sign-in button now matches Get started in width and height'] },
  { version: '0.2.0', date: '2026-10-27', changes: ['Freedom dates respect pension access, paid-off accounts stay at zero, and debt interest and shared-account safety coverage use your current numbers'] },
  { version: '0.2.0', date: '2026-10-25', changes: ['Needs and wants are sorted for you, so Today stops asking about every purchase', 'Today only asks about shops that sell both, like Target, and remembers your answer', 'New Needs & wants screen in Budget to move anything that\'s wrong for you'] },
  { version: '0.2.0', date: '2026-10-25', changes: ['Home shows how far along you are and your next milestone', 'Your next move stands out, and only one thing asks for your attention at a time', 'Linking a bank shows what it found: your payday and bills', 'Onboarding ends with your plan and first moves', 'Plan is simpler: What if now holds Compare and Scenarios'] },
  { version: '0.2.0', date: '2026-10-25', changes: ['Onboarding asks what gets in the way most, whether you rent or own, and how you invest; Home\'s next move starts from your answer', 'Spending and saving share one screen with a switch'] },
  { version: '0.2.0', date: '2026-10-25', changes: ['Profile asks you to take the FIRE type quiz instead of guessing your type, and shows the free Pro month for finishing it', 'Screen recordings show labels and buttons; amounts, numbers, names and anything you type stay hidden'] },
  { version: '0.2.0', date: '2026-10-24', changes: ['Screen recordings to help us fix confusing screens, with every amount, name and text hidden'] },
  { version: '0.1.0', date: '2026-10-24', changes: ['Connect a bank shows a spinner while Plaid opens', 'Android: connect a bank inside the app instead of the website', 'Android: Explore shows the city list, fixing a crash when opening it', 'Android: Google sign-in no longer flashes an "Unmatched Route" page'] },
  { version: '0.1.0', date: '2026-10-23', changes: ['Home has a "Get set up" checklist that adds the bills it finds in your bank in one tap'] },
  { version: '0.1.0', date: '2026-10-22', changes: ['First Android build, free plan only'] },
  { version: '0.1.0', date: '2026-10-20', changes: ['Safety cash now counts toward freedom, with cash returns instead of stock returns', 'Home uses a fixed layout; dashboard editing has been removed'] },
  {
    version: '0.1.0',
    date: '2026-10-19',
    changes: [
      'Tax estimates are paused while we test them; enter your take-home pay',
      'Freedom date says when the target is already reached',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-18',
    changes: [
      'Home shows what is yours until payday',
      'Home shows your one next move',
      'Freedom chart is a curve with 25% and 50% marks',
      'Sign-in kept in the iPhone Keychain',
      'Crash reports (no money amounts)',
      'Asks you to update when this version is too old',
      'Banks like Chase can bring you back to the app',
    ],
  },
]

/** "0.1.0 (1)", plus the quick-fix update it's running, e.g. "· fix 3f9a2c1d". */
export function versionLabel(): string {
  const version = Application.nativeApplicationVersion ?? '—'
  const build = Application.nativeBuildVersion
  const fix = !Updates.isEmbeddedLaunch && Updates.updateId ? ` · fix ${Updates.updateId.slice(0, 8)}` : ''
  return `${version}${build ? ` (${build})` : ''}${fix}`
}
