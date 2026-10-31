/** @type {import('tailwindcss').Config} */
// The website's v3 Warm tokens (../app/globals.css, ../docs/design/design-system.md).
// The one rule: green acts, teal means freedom. Teal is never a button.
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Themes follow the phone's appearance through CSS variables, not dark: classes.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Set per theme as CSS variables on the root view (src/theme/colors.ts, ThemeRoot).
        // ground = page, card = panels, surface = inset, surface-2 = deeper inset
        ground: 'rgb(var(--uf-ground) / <alpha-value>)',
        card: 'rgb(var(--uf-card) / <alpha-value>)',
        surface: 'rgb(var(--uf-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--uf-surface-2) / <alpha-value>)',
        border: 'rgb(var(--uf-border) / <alpha-value>)',
        'border-2': 'rgb(var(--uf-border-2) / <alpha-value>)',
        // ink: warm browns, never black
        ink: 'rgb(var(--uf-ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--uf-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--uf-ink-3) / <alpha-value>)',
        // green acts
        green: { DEFAULT: 'rgb(var(--uf-green) / <alpha-value>)', 700: 'rgb(var(--uf-green-700) / <alpha-value>)', 900: 'rgb(var(--uf-green-900) / <alpha-value>)', 100: 'rgb(var(--uf-green-100) / <alpha-value>)', 50: 'rgb(var(--uf-green-50) / <alpha-value>)' },
        // teal means freedom: progress toward the freedom date only
        teal: { DEFAULT: 'rgb(var(--uf-teal) / <alpha-value>)', deep: 'rgb(var(--uf-teal-deep) / <alpha-value>)', soft: 'rgb(var(--uf-teal-soft) / <alpha-value>)', line: 'rgb(var(--uf-teal-line) / <alpha-value>)' },
        pos: 'rgb(var(--uf-pos) / <alpha-value>)',
        'pos-ink': 'rgb(var(--uf-pos-ink) / <alpha-value>)',
        neg: 'rgb(var(--uf-neg) / <alpha-value>)',
        'neg-ink': 'rgb(var(--uf-neg-ink) / <alpha-value>)',
        'move-ink': 'rgb(var(--uf-move-ink) / <alpha-value>)',
        'neg-bg': 'rgb(var(--uf-neg-bg) / <alpha-value>)',
        warn: 'rgb(var(--uf-warn) / <alpha-value>)',
        'warn-bg': 'rgb(var(--uf-warn-bg) / <alpha-value>)',
        // the same in both themes: the logo's sun, and the deep green behind the welcome and reveal
        aqua: '#FFE58A',
        brand: '#151719',
        mint: '#E3F7EF',
        sun: '#FFE58A',
      },
      fontFamily: {
        // Weights map to the loaded files in src/components/Text.tsx.
        display: ['Inter'],
        sans: ['Inter'],
        mono: ['Inter'],
      },
      borderRadius: {
        control: '12px',
        card: '20px',
        modal: '28px',
      },
    },
  },
  plugins: [],
}
