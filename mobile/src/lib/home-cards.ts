/**
 * The website's Home cards the app draws, by their lib/dashboard-layout id.
 * Order and visibility come from the account's layout, so Home is arranged
 * the same in the app and on untilfire.com. Cards the app doesn't draw yet
 * keep their place in the layout but don't show here.
 */
export const APP_HOME_CARDS = ['hero', 'contribution', 'month', 'glance', 'free', 'compare', 'goals'] as const
