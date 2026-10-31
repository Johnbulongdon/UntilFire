// The website's Next Horizon tokens (../app/globals.css: :root and .dark), in both
// themes. Tailwind classes read them as CSS variables (tailwind.config.js), set
// on the root view by ThemeRoot; `colors` is for the places that take a colour
// value rather than a className: icons, the tab bar, spinners, sliders.
// Legacy colour names remain aliases for black actions and yellow progress.
import { vars } from 'nativewind'

const light = {
  ground: '#F8F8FB',
  card: '#FFFFFF',
  surface: '#F1EFF6',
  surface2: '#E9E6F0',
  border: '#E7E5ED',
  border2: '#A5A3B3',
  ink: '#151719',
  ink2: '#5C6170',
  // The website's #9A8B76 is 3.1:1 on ground; darkened to pass WCAG AA (4.5:1) for small text.
  ink3: '#686D7C',
  green: '#151719',
  green700: '#303238',
  green900: '#151719',
  green100: '#FFE58A',
  green50: '#FFF5CB',
  teal: '#151719',
  tealDeep: '#151719',
  tealSoft: '#FFE58A',
  tealLine: '#B49B3E',
  pos: '#17684B',
  posInk: '#17684B',
  neg: '#B63D46',
  negInk: '#A52C35',
  // transfers: money moved between your own accounts, neither in nor out
  moveInk: '#2F5DA8',
  negBg: '#FCE8EB',
  warn: '#815A16',
  warnBg: '#FFF1D2',
}

type Palette = typeof light

const dark: Palette = {
  ground: '#151719',
  card: '#202226',
  surface: '#282A30',
  surface2: '#32353D',
  border: '#3A3D46',
  border2: '#747986',
  ink: '#FAFAFD',
  ink2: '#C3C6D0',
  // The website's #8A7C68 passes on the ground (4.6:1) but not on cards (4.2:1); lightened to pass AA on both.
  ink3: '#A9ADBA',
  green: '#FAFAFD',
  green700: '#E0E2EA',
  green900: '#FFFFFF',
  green100: '#4B4226',
  green50: '#302D23',
  teal: '#FFE58A',
  tealDeep: '#FFE58A',
  tealSoft: '#3F3825',
  tealLine: '#B49B3E',
  pos: '#8FD8B9',
  posInk: '#8FD8B9',
  neg: '#F4A5AC',
  negInk: '#F4A5AC',
  moveInk: '#9FC3F2',
  negBg: '#48272E',
  warn: '#F2D18A',
  warnBg: '#41351D',
}

/** Theme-independent: the logo's sun and the deep green the welcome and reveal screens sit on. */
export const brand = { aqua: '#FFE58A', deep: '#151719', sun: '#FFE58A', yellow: '#FFE58A', mint: '#E3F7EF', lilac: '#EEE9FA', blue: '#E8F3FF', pink: '#FBE7F2' } as const

/**
 * Each tab's bright colour (founder's call, Oct 2026: one colour per place, like
 * Duolingo's units). Deep enough for white text in both themes. Green stays the
 * action colour everywhere, so no tab is green.
 */
export const TAB_COLOR = { home: '#151719', money: '#151719', plan: '#151719', profile: '#151719' } as const
export type TabKey = keyof typeof TAB_COLOR

// The tab colours as text on the warm-dark ground, lighter so they keep their contrast.
const TAB_INK_DARK: Record<TabKey, string> = { home: '#FFE58A', money: '#E8F3FF', plan: '#EEE9FA', profile: '#E3F7EF' }

let current: Palette = light

/** The active theme's colours. Read at render time, so a screen picks up a theme change when it next renders. */
export const colors = new Proxy({} as Palette & typeof brand, {
  get: (_t, key: string) => (key in brand ? brand[key as keyof typeof brand] : current[key as keyof Palette]),
})

/** A tab's colour for text and headlines on the page: the solid colour in light, a lighter one in dark. */
export function tabInk(tab: TabKey): string {
  return current === dark ? TAB_INK_DARK[tab] : TAB_COLOR[tab]
}

export function setPalette(scheme: 'light' | 'dark') {
  current = scheme === 'dark' ? dark : light
}

const rgb = (hex: string) => `${parseInt(hex.slice(1, 3), 16)} ${parseInt(hex.slice(3, 5), 16)} ${parseInt(hex.slice(5, 7), 16)}`
const toVars = (p: Palette) => vars({
  '--uf-ground': rgb(p.ground), '--uf-card': rgb(p.card), '--uf-surface': rgb(p.surface), '--uf-surface-2': rgb(p.surface2),
  '--uf-border': rgb(p.border), '--uf-border-2': rgb(p.border2),
  '--uf-ink': rgb(p.ink), '--uf-ink-2': rgb(p.ink2), '--uf-ink-3': rgb(p.ink3),
  '--uf-green': rgb(p.green), '--uf-green-700': rgb(p.green700), '--uf-green-900': rgb(p.green900),
  '--uf-green-100': rgb(p.green100), '--uf-green-50': rgb(p.green50),
  '--uf-teal': rgb(p.teal), '--uf-teal-deep': rgb(p.tealDeep), '--uf-teal-soft': rgb(p.tealSoft), '--uf-teal-line': rgb(p.tealLine),
  '--uf-pos': rgb(p.pos), '--uf-pos-ink': rgb(p.posInk), '--uf-neg': rgb(p.neg), '--uf-neg-ink': rgb(p.negInk), '--uf-move-ink': rgb(p.moveInk),
  '--uf-neg-bg': rgb(p.negBg), '--uf-warn': rgb(p.warn), '--uf-warn-bg': rgb(p.warnBg),
})

export const themeVars = { light: toVars(light), dark: toVars(dark) }
