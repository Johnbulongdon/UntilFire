import { cssInterop } from 'nativewind'
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native'

/**
 * Text in the website's fonts. React Native can't pick a weight from one
 * custom family, so `font-display font-bold` becomes the Fraunces_700Bold file
 * here. Manrope is the default, as on untilfire.com.
 */
const FILES: Record<string, Record<number, string>> = {
  Fraunces: { 400: 'Fraunces_400Regular', 500: 'Fraunces_500Medium', 600: 'Fraunces_600SemiBold', 700: 'Fraunces_700Bold' },
  Manrope: { 400: 'Manrope_400Regular', 500: 'Manrope_500Medium', 600: 'Manrope_600SemiBold', 700: 'Manrope_700Bold', 800: 'Manrope_800ExtraBold' },
  DMMono: { 400: 'DMMono_400Regular', 500: 'DMMono_500Medium' },
}

function weightOf(w: TextStyle['fontWeight']): number {
  if (w == null || w === 'normal') return 500
  if (w === 'bold') return 700
  return Number(w) || 500
}

/** The loaded file closest to the asked-for weight. */
export function fontFile(family: string | undefined, weight: TextStyle['fontWeight']): string {
  const files = FILES[family ?? 'Manrope'] ?? FILES.Manrope
  const want = weightOf(weight)
  const best = Object.keys(files).map(Number).reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a))
  return files[best]
}

const CLASS_WEIGHT: Record<string, number> = { 'font-normal': 400, 'font-medium': 500, 'font-semibold': 600, 'font-bold': 700, 'font-extrabold': 800 }

export function Text({ style, ...rest }: TextProps & { className?: string }) {
  const flat = StyleSheet.flatten(style) ?? {}
  // On the phone NativeWind hands the classes over as style; in the browser
  // preview they can arrive as a className instead, so read both.
  // react-native-web carries them as a `$$css` style object holding the class string.
  const cssClasses = ((Array.isArray(style) ? (style as unknown[]).flat(10) : [style]) as unknown[])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && '$$css' in s)
    .flatMap(s => Object.values(s).filter((v): v is string => typeof v === 'string'))
  const cls = [rest.className ?? '', ...cssClasses].join(' ')
  const family = cls.includes('font-display') ? 'Fraunces' : cls.includes('font-mono') ? 'DMMono' : flat.fontFamily
  const classWeight = Object.keys(CLASS_WEIGHT).find(k => cls.split(/\s+/).includes(k))
  const weight = classWeight ? (CLASS_WEIGHT[classWeight] as TextStyle['fontWeight']) : flat.fontWeight
  const fontFamily = fontFile(family, weight)
  // Follows the phone's text size (Dynamic Type), capped so big numbers and rows still fit.
  return <RNText maxFontSizeMultiplier={1.5} {...rest} style={[style, { fontFamily, fontWeight: undefined }]} />
}

cssInterop(Text, { className: 'style' })
