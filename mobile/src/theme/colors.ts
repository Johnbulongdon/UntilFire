// The website's v3 Warm tokens (../app/globals.css: :root and .dark), in both
// themes. Tailwind classes read them as CSS variables (tailwind.config.js), set
// on the root view by ThemeRoot; `colors` is for the places that take a colour
// value rather than a className: icons, the tab bar, spinners, sliders.
// Green acts. Teal means freedom, and is never a button.
import { vars } from 'nativewind'

const light = {
  ground: '#FDF8F1',
  card: '#FFFDFA',
  surface: '#F7EFE3',
  surface2: '#F0E5D5',
  border: '#EFE2D0',
  border2: '#DFCDB4',
  ink: '#221B12',
  ink2: '#6B5C48',
  // The website's #9A8B76 is 3.1:1 on ground; darkened to pass WCAG AA (4.5:1) for small text.
  ink3: '#76674F',
  green: '#12856A',
  green700: '#0C6B55',
  green900: '#06412F',
  green100: '#CDEBE1',
  green50: '#E6F5EF',
  teal: '#0E9C86',
  tealDeep: '#0A7665',
  tealSoft: '#D3F1EA',
  tealLine: '#7FD9C6',
  pos: '#12856A',
  posInk: '#107B62',
  neg: '#C0483C',
  negInk: '#B24237',
  negBg: '#FAE6E2',
  warn: '#C4831A',
  warnBg: '#FCEFD8',
}

type Palette = typeof light

const dark: Palette = {
  ground: '#16120D',
  card: '#1F1A13',
  surface: '#191410',
  surface2: '#2A2318',
  border: '#332B21',
  border2: '#463C2D',
  ink: '#F5EDE1',
  ink2: '#BAAB95',
  // The website's #8A7C68 passes on the ground (4.6:1) but not on cards (4.2:1); lightened to pass AA on both.
  ink3: '#9C8E78',
  green: '#2FA383',
  green700: '#3CBA97',
  green900: '#BFE9DA',
  green100: '#123A2E',
  green50: '#0E2C23',
  teal: '#35C9AE',
  tealDeep: '#5FDCC4',
  tealSoft: '#0F3A33',
  tealLine: '#1E6B5D',
  pos: '#2FA383',
  posInk: '#5FCFAC',
  neg: '#E07A6C',
  negInk: '#EE9B90',
  negBg: '#3A201C',
  warn: '#E0A84E',
  warnBg: '#3A2C13',
}

/** Theme-independent: the logo's sun and the deep green the welcome and reveal screens sit on. */
export const brand = { aqua: '#62FAE3', deep: '#06412F', sun: '#F2A65A' } as const

let current: Palette = light

/** The active theme's colours. Read at render time, so a screen picks up a theme change when it next renders. */
export const colors = new Proxy({} as Palette & typeof brand, {
  get: (_t, key: string) => (key in brand ? brand[key as keyof typeof brand] : current[key as keyof Palette]),
})

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
  '--uf-pos': rgb(p.pos), '--uf-pos-ink': rgb(p.posInk), '--uf-neg': rgb(p.neg), '--uf-neg-ink': rgb(p.negInk),
  '--uf-neg-bg': rgb(p.negBg), '--uf-warn': rgb(p.warn), '--uf-warn-bg': rgb(p.warnBg),
})

export const themeVars = { light: toVars(light), dark: toVars(dark) }
