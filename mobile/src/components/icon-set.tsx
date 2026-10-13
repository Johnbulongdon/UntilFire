import type { ReactElement } from 'react'
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg'

/**
 * UntilFire's own icon set (D-76): chunky, rounded, two-tone. Each icon is
 * drawn on a 24×24 grid in one colour; the back layer is the same colour at
 * 45% so icons read as solid shapes with depth, like the rest of the V2 frame.
 * Keyed by the SF Symbol name the screens already use, so swapping is free.
 */
const B = 0.45 // back-layer opacity

type Draw = (c: string) => ReactElement
const line = (c: string, w = 2.6) => ({ stroke: c, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' })

export const ICONS: Record<string, Draw> = {
  // Actions
  plus: c => <Path d="M12 5v14M5 12h14" {...line(c, 3.2)} />,
  'plus.circle.fill': c => <G><Circle cx={12} cy={12} r={10} fill={c} opacity={B} /><Path d="M12 7.5v9M7.5 12h9" {...line(c, 2.8)} /></G>,
  checkmark: c => <Path d="M5 12.5l4.5 4.5L19 7.5" {...line(c, 3.2)} />,
  'checkmark.circle.fill': c => <G><Circle cx={12} cy={12} r={10} fill={c} opacity={B} /><Path d="M7.5 12.3l3 3 6-6.3" {...line(c, 2.8)} /></G>,
  xmark: c => <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...line(c, 3)} />,
  checklist: c => <G><Rect x={3} y={3} width={18} height={18} rx={5} fill={c} opacity={B} /><Path d="M7 9l1.6 1.6L11.5 7.6M7 15l1.6 1.6 2.9-3M14 9h3M14 15h3" {...line(c, 2.2)} /></G>,
  'list.bullet': c => <G><Circle cx={5} cy={6.5} r={1.9} fill={c} /><Circle cx={5} cy={12} r={1.9} fill={c} /><Circle cx={5} cy={17.5} r={1.9} fill={c} /><Path d="M10 6.5h10M10 12h10M10 17.5h10" {...line(c, 2.6)} opacity={0.8} /></G>,
  'arrow.up.right': c => <Path d="M7 17L17 7M9 7h8v8" {...line(c, 3)} />,
  'arrow.up.right.circle.fill': c => <G><Circle cx={12} cy={12} r={10} fill={c} opacity={B} /><Path d="M8.5 15.5l7-7M10 8.5h5.5V14" {...line(c, 2.6)} /></G>,
  'arrow.up.forward.circle.fill': c => <G><Circle cx={12} cy={12} r={10} fill={c} opacity={B} /><Path d="M8.5 15.5l7-7M10 8.5h5.5V14" {...line(c, 2.6)} /></G>,
  'arrow.down.circle.fill': c => <G><Circle cx={12} cy={12} r={10} fill={c} opacity={B} /><Path d="M12 6.8v10M7.8 12.8l4.2 4.2 4.2-4.2" {...line(c, 2.6)} /></G>,
  'arrow.left.arrow.right': c => <Path d="M4 8.5h15M15.5 5l3.5 3.5-3.5 3.5M20 15.5H5M8.5 12L5 15.5 8.5 19" {...line(c, 2.5)} />,
  'wand.and.stars': c => <G><Path d="M4 20L15 9" {...line(c, 3.2)} /><Path d="M15 9l2-2" {...line(c, 3.2)} opacity={B} /><Path d="M18 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM8 3.5l.6 1.4 1.4.6-1.4.6L8 7.5l-.6-1.4L6 5.5l1.4-.6zM20 12l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill={c} /></G>,
  sparkles: c => <G><Path d="M10 3l1.8 4.6L16.5 9.5l-4.7 1.9L10 16l-1.8-4.6L3.5 9.5l4.7-1.9z" fill={c} /><Path d="M18 13l1 2.4 2.5 1-2.5 1L18 20l-1-2.6-2.5-1 2.5-1z" fill={c} opacity={B} /></G>,
  'bell.fill': c => <G><Path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" fill={c} /><Path d="M9.5 18.5a2.5 2.5 0 0 0 5 0z" fill={c} opacity={B} /></G>,

  // Money
  'creditcard.fill': c => <G><Rect x={2} y={5} width={20} height={14} rx={3.5} fill={c} opacity={B} /><Rect x={2} y={8} width={20} height={3.2} fill={c} /><Rect x={5} y={14.5} width={5} height={2.2} rx={1.1} fill={c} /></G>,
  'banknote.fill': c => <G><Rect x={2} y={6} width={20} height={12} rx={3} fill={c} opacity={B} /><Circle cx={12} cy={12} r={3.3} fill={c} /><Circle cx={5.5} cy={12} r={1.3} fill={c} /><Circle cx={18.5} cy={12} r={1.3} fill={c} /></G>,
  'building.columns.fill': c => <G><Path d="M12 2.5L21.5 7.5v1.5h-19V7.5z" fill={c} /><Path d="M5 11h2.6v6.5H5zM10.7 11h2.6v6.5h-2.6zM16.4 11H19v6.5h-2.6z" fill={c} opacity={B} /><Rect x={2.5} y={18.5} width={19} height={3} rx={1.2} fill={c} /></G>,
  'chart.pie.fill': c => <G><Circle cx={12} cy={12} r={9.5} fill={c} opacity={B} /><Path d="M12 2.5A9.5 9.5 0 0 1 21.5 12H12z" fill={c} /></G>,
  'chart.bar.fill': c => <G><Rect x={3} y={12} width={4.5} height={9} rx={1.6} fill={c} opacity={B} /><Rect x={9.75} y={7} width={4.5} height={14} rx={1.6} fill={c} /><Rect x={16.5} y={3} width={4.5} height={18} rx={1.6} fill={c} opacity={B} /></G>,
  'chart.line.uptrend.xyaxis': c => <G><Path d="M3 3v18h18" {...line(c, 2.4)} opacity={B} /><Path d="M7 15l4-4 3 3 6-6.5M16 7.5h4v4" {...line(c, 2.6)} /></G>,
  calendar: c => <G><Rect x={3} y={4.5} width={18} height={16.5} rx={4} fill={c} opacity={B} /><Path d="M3 8.5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v1.5H3z" fill={c} /><Path d="M8 2.5v4M16 2.5v4" {...line(c, 2.4)} /><Rect x={7} y={13} width={3.2} height={3.2} rx={1} fill={c} /><Rect x={13.8} y={13} width={3.2} height={3.2} rx={1} fill={c} /></G>,
  'lightbulb.fill': c => <G><Path d="M12 2.5a7 7 0 0 0-4.2 12.6c.7.6 1.2 1.4 1.2 2.4h6c0-1 .5-1.8 1.2-2.4A7 7 0 0 0 12 2.5z" fill={c} /><Rect x={9} y={18.5} width={6} height={3} rx={1.5} fill={c} opacity={B} /></G>,
  'square.grid.2x2.fill': c => <G><Rect x={3} y={3} width={8} height={8} rx={2.5} fill={c} /><Rect x={13} y={3} width={8} height={8} rx={2.5} fill={c} opacity={B} /><Rect x={3} y={13} width={8} height={8} rx={2.5} fill={c} opacity={B} /><Rect x={13} y={13} width={8} height={8} rx={2.5} fill={c} /></G>,
  'shield.lefthalf.filled': c => <G><Path d="M12 2.5l8 3v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10v-6z" fill={c} opacity={B} /><Path d="M12 2.5v19c-4.5-1.4-8-5-8-10v-6z" fill={c} /></G>,
  'square.stack.3d.up.fill': c => <G><Path d="M12 2.5l9 4.5-9 4.5L3 7z" fill={c} /><Path d="M3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" {...line(c, 2.4)} opacity={B} /></G>,

  // Plan
  'sun.max.fill': c => <G><Circle cx={12} cy={12} r={5} fill={c} /><Path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" {...line(c, 2.4)} opacity={0.7} /></G>,
  'sunrise.fill': c => <G><Path d="M5.5 16a6.5 6.5 0 0 1 13 0z" fill={c} /><Path d="M12 3v3.5M4.2 8.2l2 2M19.8 8.2l-2 2" {...line(c, 2.4)} opacity={0.7} /><Path d="M2.5 19.5h19" {...line(c, 2.6)} /></G>,
  target: c => <G><Circle cx={12} cy={12} r={9.5} fill={c} opacity={B} /><Circle cx={12} cy={12} r={5.5} fill="none" stroke={c} strokeWidth={2.4} /><Circle cx={12} cy={12} r={2} fill={c} /></G>,
  'square.split.2x1.fill': c => <G><Rect x={2.5} y={4} width={8.5} height={16} rx={3} fill={c} /><Rect x={13} y={4} width={8.5} height={16} rx={3} fill={c} opacity={B} /></G>,
  'globe.americas.fill': c => <G><Circle cx={12} cy={12} r={9.5} fill={c} opacity={B} /><Ellipse cx={12} cy={12} rx={4.2} ry={9.5} {...line(c, 2.2)} /><Path d='M3 12h18M4.5 7.5h15M4.5 16.5h15' {...line(c, 2)} /></G>,
  'person.text.rectangle.fill': c => <G><Rect x={2} y={4.5} width={20} height={15} rx={3.5} fill={c} opacity={B} /><Circle cx={8} cy={10.5} r={2.4} fill={c} /><Path d="M4.8 16.5a3.2 3.2 0 0 1 6.4 0z" fill={c} /><Path d="M14 10h4.5M14 14h3" {...line(c, 2.2)} /></G>,
  'book.fill': c => <G><Path d="M3 5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16a3 3 0 0 0-3-2H3z" fill={c} /><Path d="M21 5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v16a3 3 0 0 1 3-2h6z" fill={c} opacity={B} /></G>,

  // People and devices
  'person.crop.circle': c => <G><Circle cx={12} cy={12} r={9.5} fill="none" stroke={c} strokeWidth={2.2} /><Circle cx={12} cy={10} r={3.2} fill={c} /><Path d="M6.5 18.2a6 6 0 0 1 11 0" {...line(c, 2.4)} /></G>,
  'person.crop.circle.fill': c => <G><Circle cx={12} cy={12} r={9.5} fill={c} opacity={B} /><Circle cx={12} cy={10} r={3.4} fill={c} /><Path d="M6.3 18.4a6.2 6.2 0 0 1 11.4 0A9.5 9.5 0 0 1 6.3 18.4z" fill={c} /></G>,
  laptopcomputer: c => <G><Rect x={4} y={4.5} width={16} height={11} rx={2.5} fill={c} opacity={B} /><Path d="M2 18h20" {...line(c, 3)} /></G>,
  'laptopcomputer.and.iphone': c => <G><Rect x={2.5} y={5} width={13} height={9.5} rx={2.2} fill={c} opacity={B} /><Path d="M1.5 17.5h13" {...line(c, 2.6)} /><Rect x={16} y={8} width={6.5} height={12} rx={2} fill={c} /></G>,

  // Objects
  'lock.fill': c => <G><Path d='M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5' {...line(c, 2.6)} /><Rect x={4} y={10} width={16} height={11.5} rx={3.5} fill={c} opacity={B} /><Circle cx={12} cy={15} r={1.8} fill={c} /><Path d='M12 15v3' {...line(c, 2.2)} /></G>,
  'doc.fill': c => <G><Path d='M6 2.5h8l5 5V19a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2-2.5z' fill={c} opacity={B} /><Path d='M14 2.5V6a1.5 1.5 0 0 0 1.5 1.5H19z' fill={c} /></G>,
  'doc.text.fill': c => <G><Path d='M6 2.5h8l5 5V19a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 4 19V5a2.5 2.5 0 0 1 2-2.5z' fill={c} opacity={B} /><Path d='M14 2.5V6a1.5 1.5 0 0 0 1.5 1.5H19z' fill={c} /><Path d='M8 12h8M8 16h5' {...line(c, 2.2)} /></G>,
  scissors: c => <G><Circle cx={6.5} cy={6.5} r={3} fill='none' stroke={c} strokeWidth={2.4} /><Circle cx={6.5} cy={17.5} r={3} fill='none' stroke={c} strokeWidth={2.4} /><Path d='M9 8.5L20 18M9 15.5L20 6' {...line(c, 2.6)} /></G>,
  'leaf.fill': c => <G><Path d='M20 3.5C10 3.5 4 8 4 15c0 1.8.5 3.3 1.3 4.5C14 19.5 20 13 20 3.5z' fill={c} opacity={B} /><Path d='M3.5 21C7 15 11 11.5 16 8.5' {...line(c, 2.4)} /></G>,
  'safari.fill': c => <G><Circle cx={12} cy={12} r={9.5} fill={c} opacity={B} /><Path d='M15.8 8.2l-2 5.6-5.6 2 2-5.6z' fill={c} stroke={c} strokeWidth={1.6} strokeLinejoin='round' /></G>,
  'beach.umbrella.fill': c => <G><Path d='M3 11a9 9 0 0 1 18 0z' fill={c} /><Path d='M12 11v8.5' {...line(c, 2.4)} /><Path d='M3 20.5c3-1.5 6-1.5 9 0s6 1.5 9 0' {...line(c, 2.4)} opacity={B} /></G>,
  'wifi.slash': c => <G><Path d='M2.5 9a14 14 0 0 1 19 0M6 12.5a9 9 0 0 1 12 0M9.3 16a4 4 0 0 1 5.4 0' {...line(c, 2.4)} opacity={B} /><Circle cx={12} cy={19.5} r={1.6} fill={c} /><Path d='M4 3l16 18' {...line(c, 2.6)} /></G>,

  // Categories
  'house.fill': c => <G><Path d="M3 11L12 3.5 21 11v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={c} opacity={B} /><Path d="M2 11.5L12 3l10 8.5" {...line(c, 2.6)} /><Rect x={9.5} y={14} width={5} height={7.5} rx={1.5} fill={c} /></G>,
  'fork.knife': c => <G><Path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3" {...line(c, 2.4)} /><Path d="M17 21V3c-2.5 1.2-3.5 4-3.5 7.5 0 1.7 1 2.5 3.5 2.5" fill={c} opacity={B} stroke={c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></G>,
  'car.fill': c => <G><Path d="M5 11l1.8-4.6A2.5 2.5 0 0 1 9.1 5h5.8a2.5 2.5 0 0 1 2.3 1.4L19 11" fill={c} opacity={B} /><Rect x={2.5} y={10.5} width={19} height={7} rx={3} fill={c} /><Circle cx={7} cy={18} r={2.2} fill={c} /><Circle cx={17} cy={18} r={2.2} fill={c} /></G>,
  'cross.case.fill': c => <G><Path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" {...line(c, 2.2)} /><Rect x={2.5} y={6} width={19} height={14.5} rx={3.5} fill={c} opacity={B} /><Path d="M12 9.5v7.5M8.25 13.25h7.5" {...line(c, 3)} /></G>,
  'bag.fill': c => <G><Path d="M4 8h16l-1 11.5a2.5 2.5 0 0 1-2.5 2.2h-9A2.5 2.5 0 0 1 5 19.5z" fill={c} opacity={B} /><Path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" {...line(c, 2.4)} /></G>,
  'ticket.fill': c => <G><Path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5z" fill={c} opacity={B} /><Path d="M14.5 6.5v11" stroke={c} strokeWidth={2.2} strokeDasharray="2 2.4" strokeLinecap="round" /></G>,
  'play.rectangle.fill': c => <G><Rect x={2} y={4.5} width={20} height={15} rx={4} fill={c} opacity={B} /><Path d="M10 8.8v6.4l5.3-3.2z" fill={c} stroke={c} strokeWidth={1.5} strokeLinejoin="round" /></G>,
  airplane: c => <G><Path d="M21 4.5c-.8-.8-2.2-.6-3 .2L14 8.7 5.5 6 3.8 7.7 10.5 12 7.8 14.7l-2.8-.4-1.3 1.3 3.3 1.9 1.9 3.3 1.3-1.3-.4-2.8 2.7-2.7 4.3 6.7 1.7-1.7-2.7-8.5 4-4c.8-.8 1-2.2.2-3z" fill={c} /></G>,
  'bolt.fill': c => <Path d="M13.5 2L4.5 13.5H11L10 22l9.5-12H13z" fill={c} stroke={c} strokeWidth={1.4} strokeLinejoin="round" />,
  'graduationcap.fill': c => <G><Path d="M6 11v4.5c0 1.6 2.7 3.5 6 3.5s6-1.9 6-3.5V11" fill={c} opacity={B} /><Path d="M12 4L1.5 9 12 14l10.5-5z" fill={c} /><Path d="M21 9.5v5" {...line(c, 2)} /></G>,
  'pawprint.fill': c => <G><Ellipse cx={12} cy={16} rx={5} ry={4.3} fill={c} /><Ellipse cx={5.3} cy={10.8} rx={2.1} ry={2.6} fill={c} opacity={B} /><Ellipse cx={18.7} cy={10.8} rx={2.1} ry={2.6} fill={c} opacity={B} /><Ellipse cx={9.2} cy={6.2} rx={2.1} ry={2.7} fill={c} /><Ellipse cx={14.8} cy={6.2} rx={2.1} ry={2.7} fill={c} /></G>,
  'briefcase.fill': c => <G><Path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" {...line(c, 2.2)} /><Rect x={2.5} y={7} width={19} height={13.5} rx={3.5} fill={c} opacity={B} /><Path d="M2.5 12.5h19" {...line(c, 2.2)} /><Rect x={10} y={11} width={4} height={3.2} rx={1} fill={c} /></G>,
  'gift.fill': c => <G><Rect x={3.5} y={11} width={17} height={10} rx={2.5} fill={c} opacity={B} /><Rect x={2.5} y={7} width={19} height={4.5} rx={1.8} fill={c} /><Path d="M12 7v14" {...line(c, 2.4)} /><Path d="M12 7C10.5 3.5 6.5 3.5 7 6c.3 1 2.5 1 5 1zM12 7c1.5-3.5 5.5-3.5 5-1-.3 1-2.5 1-5 1z" fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" /></G>,
}

export const hasIcon = (name: string) => name in ICONS
