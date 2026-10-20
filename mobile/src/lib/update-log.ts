import * as Application from 'expo-application'
import * as Updates from 'expo-updates'

/**
 * What changed in each phone release, newest first, shown under Profile ›
 * Version. Add an entry with every App Store build or quick-fix update; keep
 * each line short and in plain words (the founder reads it to check a build).
 */
export const UPDATE_LOG: { version: string; date: string; changes: string[] }[] = [
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
