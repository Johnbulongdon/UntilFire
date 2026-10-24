/**
 * Google sign-in comes back as untilfire://auth?code=... (or exp://.../--/auth in Expo Go).
 * On Android that link also reaches the router, which has no "auth" page and showed
 * "Unmatched Route" mid-login (John, Oct 2026). The code is already handled by
 * signInWithGoogle in state/auth, so the router ignores the link and the screen stays put.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (!isAuthReturn(path)) return path
  // Cold start from the link (app was closed while Google was open): start at the entry screen.
  return initial ? '/' : null
}

// untilfire://auth, untilfire:///auth, exp://host/--/auth or /auth, with any query.
const AUTH_RETURN = /^(untilfire:\/\/\/?|exps?:\/\/[^/]+\/--\/|\/)?auth\/?([?#]|$)/

function isAuthReturn(path: string) {
  return AUTH_RETURN.test(path)
}
