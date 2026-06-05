'use client'
import React from 'react'

const T  = '#22D3A5'  // teal — skin/figure
const D  = '#06513B'  // dark teal — features
const W  = '#FFFFFF'  // white
const G  = '#FCD34D'  // gold
const BG = '#0B3B2A'  // background
const HR = '#063C2C'  // hair / dark detail

// Clothing greens
const C1 = '#15604A'  // primary garment
const C2 = '#0E4634'  // darker garment / legs
const C3 = '#1C7A5D'  // lighter garment accent

function Wrap({ size, children }: { size: number; children: React.ReactNode }) {
  const h = Math.round(size * 4 / 3)
  return (
    <svg width={size} height={h} viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="120" height="160" fill={BG} />
      {children}
    </svg>
  )
}

// ── Coherent figure base ──────────────────────────────────────────────────────
// Head + neck + shoulders, properly connected. Returns the standard upper body.
// cx fixed at 60. Head center at (60, headY).
function Figure({
  headY = 40,
  r = 17,
  garment = C1,
  hair = HR,
  hairPath,
  children,
}: {
  headY?: number
  r?: number
  garment?: string
  hair?: string
  hairPath?: React.ReactNode
  children?: React.ReactNode  // face features + props, drawn on top
}) {
  const neckY = headY + r - 2
  const shoulderY = neckY + 6
  return (
    <>
      {/* Shoulders / torso */}
      <path
        d={`M 32 ${shoulderY + 10}
            Q 34 ${shoulderY} 44 ${shoulderY - 2}
            L 76 ${shoulderY - 2}
            Q 86 ${shoulderY} 88 ${shoulderY + 10}
            L 90 152 L 30 152 Z`}
        fill={garment}
      />
      {/* Neck */}
      <rect x="54" y={neckY - 4} width="12" height="10" rx="4" fill={T} />
      <path d={`M 54 ${neckY} Q 60 ${neckY + 4} 66 ${neckY}`} fill="rgba(0,0,0,0.12)" />
      {/* Hair (behind head) */}
      {hairPath ?? <ellipse cx="60" cy={headY - r + 5} rx={r + 1} ry={9} fill={hair} />}
      {/* Head */}
      <circle cx="60" cy={headY} r={r} fill={T} />
      {/* Face features + props passed in */}
      {children}
    </>
  )
}

// Standard eyes + smile at head center headY
function Face({
  y = 40,
  mouth = 'smile',
  eye = 'round',
}: { y?: number; mouth?: 'smile' | 'flat' | 'grin' | 'calm'; eye?: 'round' | 'narrow' | 'closed' | 'wide' }) {
  return (
    <>
      {eye === 'round' && (
        <>
          <circle cx="53" cy={y - 1} r="2.6" fill={D} />
          <circle cx="67" cy={y - 1} r="2.6" fill={D} />
          <circle cx="52" cy={y - 2} r="0.9" fill={W} opacity="0.6" />
          <circle cx="66" cy={y - 2} r="0.9" fill={W} opacity="0.6" />
        </>
      )}
      {eye === 'wide' && (
        <>
          <circle cx="53" cy={y - 1} r="3.4" fill={D} />
          <circle cx="67" cy={y - 1} r="3.4" fill={D} />
          <circle cx="51.6" cy={y - 2.4} r="1.2" fill={W} opacity="0.65" />
          <circle cx="65.6" cy={y - 2.4} r="1.2" fill={W} opacity="0.65" />
        </>
      )}
      {eye === 'narrow' && (
        <>
          <ellipse cx="53" cy={y - 1} rx="3" ry="2" fill={D} />
          <ellipse cx="67" cy={y - 1} rx="3" ry="2" fill={D} />
        </>
      )}
      {eye === 'closed' && (
        <>
          <path d={`M 50 ${y - 1} Q 53 ${y - 4} 56 ${y - 1}`} stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d={`M 64 ${y - 1} Q 67 ${y - 4} 70 ${y - 1}`} stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {mouth === 'smile' && (
        <path d={`M 54 ${y + 8} Q 60 ${y + 13} 66 ${y + 8}`} stroke={D} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {mouth === 'grin' && (
        <path d={`M 52 ${y + 7} Q 60 ${y + 15} 68 ${y + 7}`} stroke={D} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {mouth === 'flat' && (
        <line x1="54" y1={y + 9} x2="66" y2={y + 9} stroke={D} strokeWidth="2.2" strokeLinecap="round" />
      )}
      {mouth === 'calm' && (
        <path d={`M 55 ${y + 8} Q 60 ${y + 11} 65 ${y + 8}`} stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </>
  )
}

// ── PERB: The Calculated Opportunist (Spreadsheet Nerd) ───────────────────────
function SpreadsheetNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Figure headY={38} garment="#11402F">
        {/* Suit lapels + tie */}
        <path d="M 50 60 L 56 78 L 60 64 Z" fill={C2} />
        <path d="M 70 60 L 64 78 L 60 64 Z" fill={C2} />
        <rect x="57.5" y="62" width="5" height="20" rx="2" fill={G} />
        {/* Glasses — spaced, non-overlapping */}
        <circle cx="52" cy="37" r="8" fill="rgba(6,81,59,0.55)" stroke={W} strokeWidth="2.5" />
        <circle cx="68" cy="37" r="8" fill="rgba(6,81,59,0.55)" stroke={W} strokeWidth="2.5" />
        <line x1="60" y1="37" x2="60" y2="37" stroke={W} strokeWidth="2.5" />
        <line x1="59" y1="37" x2="61" y2="37" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="44" y1="37" x2="39" y2="39" stroke={W} strokeWidth="2" strokeLinecap="round" />
        <line x1="76" y1="37" x2="81" y2="39" stroke={W} strokeWidth="2" strokeLinecap="round" />
        {/* Eyes behind glasses */}
        <circle cx="52" cy="37" r="2.4" fill={D} />
        <circle cx="68" cy="37" r="2.4" fill={D} />
        <path d="M 55 49 Q 60 53 65 49" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      </Figure>
      {/* Laptop in lap — sits in front of torso, doesn't cover face */}
      <rect x="26" y="112" width="68" height="40" rx="4" fill="#0E4634" />
      <rect x="30" y="116" width="60" height="32" rx="2" fill="#053022" />
      {/* Mini bar chart */}
      <rect x="36" y="132" width="6" height="12" rx="1" fill={T} opacity="0.55" />
      <rect x="45" y="127" width="6" height="17" rx="1" fill={T} opacity="0.75" />
      <rect x="54" y="123" width="6" height="21" rx="1" fill={T} />
      <rect x="63" y="129" width="6" height="15" rx="1" fill={G} opacity="0.8" />
      <rect x="72" y="120" width="6" height="24" rx="1" fill={G} />
      <line x1="34" y1="144" x2="86" y2="144" stroke={T} strokeWidth="0.8" opacity="0.4" />
    </Wrap>
  )
}

// ── PEGF: The Ambitious Nomad (Digital Nomad) ─────────────────────────────────
function DigitalNomad({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Plane trail in sky */}
      <path d="M 78 18 L 104 12 L 99 17 L 108 14 L 86 26 L 84 21 Z" fill={T} opacity="0.22" />
      <Figure headY={40} hair="#0E4634" garment="#15604A">
        {/* Backpack straps */}
        <path d="M 50 60 Q 47 80 49 120" stroke={C3} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        <path d="M 70 60 Q 73 80 71 120" stroke={C3} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* Wraparound shades */}
        <rect x="44" y="35" width="14" height="9" rx="3.5" fill={D} stroke={W} strokeWidth="2.2" />
        <rect x="62" y="35" width="14" height="9" rx="3.5" fill={D} stroke={W} strokeWidth="2.2" />
        <line x1="58" y1="39" x2="62" y2="39" stroke={W} strokeWidth="2.2" />
        <line x1="44" y1="39" x2="39" y2="41" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="76" y1="39" x2="81" y2="41" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="47" y="37" width="5" height="2.5" rx="1.2" fill={W} opacity="0.25" />
        <rect x="65" y="37" width="5" height="2.5" rx="1.2" fill={W} opacity="0.25" />
        <path d="M 54 50 Q 60 55 66 50" stroke={D} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </Figure>
      {/* Boarding pass held up */}
      <g transform="rotate(-8 30 120)">
        <rect x="14" y="108" width="34" height="24" rx="3" fill={G} opacity="0.95" />
        <rect x="18" y="113" width="18" height="3" rx="1.5" fill={D} opacity="0.4" />
        <rect x="18" y="119" width="12" height="2.5" rx="1.2" fill={D} opacity="0.3" />
        <line x1="40" y1="108" x2="40" y2="132" stroke={D} strokeWidth="1" opacity="0.3" strokeDasharray="2 2" />
        {[42, 44.5, 47].map((x, i) => <rect key={i} x={x} y="113" width="1.2" height="14" fill={D} opacity="0.4" />)}
      </g>
    </Wrap>
  )
}

// ── ASGF: The Easy Rider (Beach Bum Millionaire) ──────────────────────────────
function BeachBum({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Sun + sea */}
      <circle cx="94" cy="22" r="13" fill={G} opacity="0.2" />
      <path d="M 0 134 Q 30 127 60 132 Q 90 127 120 134 L 120 160 L 0 160 Z" fill={D} opacity="0.45" />
      <path d="M 8 138 Q 24 133 40 138" stroke={T} strokeWidth="1.3" fill="none" opacity="0.4" />
      <path d="M 70 142 Q 86 137 102 142" stroke={T} strokeWidth="1.3" fill="none" opacity="0.4" />
      {/* Sun hat (behind head) */}
      <ellipse cx="60" cy="26" rx="30" ry="7" fill={G} opacity="0.92" />
      <path d="M 42 26 Q 44 12 60 12 Q 76 12 78 26 Z" fill={G} />
      <rect x="42" y="23" width="36" height="4" rx="2" fill="#D9990B" opacity="0.7" />
      <Figure headY={44} hair="transparent" garment="#15604A">
        {/* Shirt flowers */}
        <circle cx="50" cy="74" r="2.6" fill={T} opacity="0.5" />
        <circle cx="68" cy="70" r="2.6" fill={G} opacity="0.45" />
        <circle cx="60" cy="84" r="2.6" fill={T} opacity="0.4" />
        {/* Round shades */}
        <circle cx="53" cy="44" r="7.5" fill={D} stroke={W} strokeWidth="2.2" />
        <circle cx="67" cy="44" r="7.5" fill={D} stroke={W} strokeWidth="2.2" />
        <line x1="60.5" y1="44" x2="59.5" y2="44" stroke={W} strokeWidth="2.2" />
        <line x1="45.5" y1="44" x2="40" y2="46" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="74.5" y1="44" x2="80" y2="46" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="50" cy="42" r="1.8" fill={W} opacity="0.25" />
        <circle cx="64" cy="42" r="1.8" fill={W} opacity="0.25" />
        <path d="M 53 56 Q 60 63 67 56" stroke={D} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      </Figure>
      {/* Cocktail in hand */}
      <polygon points="86,96 110,96 102,116 94,116" fill={T} opacity="0.85" />
      <polygon points="89,100 107,100 103.5,110 92.5,110" fill={T} opacity="0.4" />
      <rect x="97" y="116" width="2" height="12" fill={W} opacity="0.8" />
      <rect x="90" y="128" width="16" height="3" rx="1.5" fill={W} opacity="0.8" />
      <line x1="106" y1="94" x2="112" y2="82" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="113" cy="80" r="3" fill={T} opacity="0.6" />
    </Wrap>
  )
}

// ── PSRF: The Steady Minimalist (Minimalist Monk) ─────────────────────────────
function MinimalistMonk({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Calm rings */}
      <circle cx="60" cy="84" r="60" fill="none" stroke={T} strokeWidth="3" opacity="0.07" />
      <circle cx="60" cy="84" r="46" fill="none" stroke={T} strokeWidth="4" opacity="0.1" />
      <circle cx="60" cy="84" r="32" fill="none" stroke={T} strokeWidth="5" opacity="0.13" />
      {/* Halo */}
      <circle cx="60" cy="14" r="7" fill={G} opacity="0.4" />
      <circle cx="60" cy="14" r="14" fill={G} opacity="0.12" />
      {/* Robe spread */}
      <path d="M 14 152 Q 24 92 60 84 Q 96 92 106 152 Z" fill="#15604A" />
      <path d="M 22 152 Q 32 102 60 96 Q 88 102 98 152" fill="#1C7A5D" opacity="0.35" />
      {/* Head (shaved, no hair) */}
      <circle cx="60" cy="42" r="18" fill={T} />
      <Face y={42} mouth="calm" eye="closed" />
      {/* Hands in mudra */}
      <ellipse cx="42" cy="112" rx="13" ry="6" fill={T} opacity="0.85" transform="rotate(-14 42 112)" />
      <ellipse cx="78" cy="112" rx="13" ry="6" fill={T} opacity="0.85" transform="rotate(14 78 112)" />
      <ellipse cx="60" cy="116" rx="9" ry="5" fill={T} opacity="0.7" />
    </Wrap>
  )
}

// ── PSGB: The Strategic Builder (Chess Player) ────────────────────────────────
function ChessPlayer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Chess board */}
      {Array.from({ length: 3 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => (
          <rect key={`${row}-${col}`} x={col * 15} y={136 + row * 8} width="15" height="8"
            fill={(col + row) % 2 === 0 ? 'rgba(34,211,165,0.16)' : 'rgba(255,255,255,0.04)'} />
        ))
      )}
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="flat" eye="narrow" />
        {/* Hand on chin */}
        <rect x="50" y="56" width="20" height="9" rx="4.5" fill={T} opacity="0.9" />
        <rect x="56" y="46" width="9" height="14" rx="4.5" fill={T} opacity="0.9" />
      </Figure>
      {/* Chess king piece on board, to the side */}
      <g opacity="0.9">
        <rect x="84" y="96" width="18" height="30" rx="3" fill={W} />
        <rect x="80" y="124" width="26" height="6" rx="3" fill={W} />
        <rect x="89" y="84" width="8" height="14" rx="3" fill={W} />
        <rect x="84" y="88" width="18" height="6" rx="2" fill={W} />
        <rect x="91.5" y="78" width="3" height="8" rx="1.5" fill={W} />
        <rect x="88" y="80" width="10" height="3" rx="1.5" fill={W} />
      </g>
    </Wrap>
  )
}

// ── AERB: The Bold Experimenter (Mad Scientist) ───────────────────────────────
function MadScientist({ size }: { size: number }) {
  const spikes = "M 40 30 L 36 12 L 44 22 L 44 8 L 52 20 L 54 6 L 60 18 L 66 6 L 68 20 L 76 8 L 76 22 L 84 12 L 80 30 Z"
  return (
    <Wrap size={size}>
      <Figure headY={42} hair="transparent" garment={W} hairPath={<path d={spikes} fill={T} opacity="0.8" />}>
        {/* Lab coat lapels */}
        <path d="M 50 62 L 56 80 L 60 66 Z" fill="#DCE8E4" />
        <path d="M 70 62 L 64 80 L 60 66 Z" fill="#DCE8E4" />
        {/* Goggles */}
        <circle cx="53" cy="42" r="9" fill="rgba(6,81,59,0.5)" stroke={W} strokeWidth="2.6" />
        <circle cx="67" cy="42" r="9" fill="rgba(6,81,59,0.5)" stroke={W} strokeWidth="2.6" />
        <line x1="60" y1="42" x2="60" y2="42" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
        <line x1="59" y1="42" x2="61" y2="42" stroke={W} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="53" cy="42" r="2.4" fill={D} />
        <circle cx="67" cy="42" r="2.4" fill={D} />
        <circle cx="50" cy="39" r="2" fill={W} opacity="0.35" />
        <circle cx="64" cy="39" r="2" fill={W} opacity="0.35" />
        {/* Grin with teeth */}
        <path d="M 52 54 Q 60 62 68 54" stroke={D} strokeWidth="2.3" fill="none" strokeLinecap="round" />
        <rect x="55" y="54" width="4" height="3" rx="1" fill={W} />
        <rect x="61" y="54" width="4" height="3" rx="1" fill={W} />
      </Figure>
      {/* Bubbling flask in hand */}
      <path d="M 90 96 L 86 110 Q 83 124 94 128 Q 105 124 102 110 L 98 96 Z" fill={T} opacity="0.8" stroke={W} strokeWidth="1.5" />
      <rect x="88" y="90" width="12" height="7" rx="3" fill={W} opacity="0.9" />
      <circle cx="94" cy="115" r="2.5" fill={W} opacity="0.5" />
      <circle cx="90" cy="120" r="1.8" fill={W} opacity="0.4" />
      <circle cx="100" cy="86" r="2.5" fill={T} opacity="0.5" />
      <circle cx="104" cy="78" r="3.2" fill={T} opacity="0.35" />
      <circle cx="98" cy="72" r="2" fill={T} opacity="0.25" />
    </Wrap>
  )
}

// ── AEGB: The Dynamic Builder (Serial Hustler) ────────────────────────────────
function SerialHustler({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Lightning */}
      <path d="M 14 20 L 8 38 L 16 38 L 10 58" stroke={G} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 108 24 L 102 42 L 110 42 L 104 62" stroke={G} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.6" />
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="grin" eye="wide" />
      </Figure>
      {/* Phone left hand */}
      <g transform="rotate(-12 28 110)">
        <rect x="18" y="92" width="22" height="38" rx="4" fill={W} opacity="0.92" />
        <rect x="21" y="95" width="16" height="30" rx="2" fill="#053022" />
        <rect x="23" y="99" width="12" height="2.5" rx="1" fill={T} />
        <rect x="23" y="104" width="8" height="2.5" rx="1" fill={G} opacity="0.7" />
        <rect x="23" y="109" width="10" height="2.5" rx="1" fill={T} opacity="0.6" />
      </g>
      {/* Phone right hand */}
      <g transform="rotate(12 92 110)">
        <rect x="80" y="92" width="22" height="38" rx="4" fill={W} opacity="0.92" />
        <rect x="83" y="95" width="16" height="30" rx="2" fill="#053022" />
        <rect x="85" y="99" width="12" height="2.5" rx="1" fill={G} />
        <rect x="85" y="104" width="8" height="2.5" rx="1" fill={T} opacity="0.6" />
        <rect x="85" y="109" width="10" height="2.5" rx="1" fill={T} opacity="0.5" />
      </g>
    </Wrap>
  )
}

// ── AERF: The Free Spirit ─────────────────────────────────────────────────────
function FreeSpirit({ size }: { size: number }) {
  const hair = (
    <>
      <path d="M 42 38 Q 30 14 46 10 Q 58 8 60 22 Q 62 8 74 10 Q 90 14 78 38 Z" fill={HR} />
      <path d="M 38 36 Q 26 20 36 12" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 82 36 Q 94 20 84 12" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
    </>
  )
  return (
    <Wrap size={size}>
      {/* Butterfly */}
      <g transform="translate(90 30)">
        <path d="M 0 0 Q 14 -10 18 4 Q 14 14 0 8 Z" fill={T} opacity="0.6" />
        <path d="M 0 8 Q 14 16 12 26 Q 4 22 0 14 Z" fill={T} opacity="0.4" />
        <path d="M 0 0 Q -14 -10 -18 4 Q -14 14 0 8 Z" fill={G} opacity="0.55" />
        <path d="M 0 8 Q -14 16 -12 26 Q -4 22 0 14 Z" fill={G} opacity="0.35" />
        <ellipse cx="0" cy="6" rx="2.4" ry="7" fill={D} opacity="0.6" />
      </g>
      <Figure headY={42} hair="transparent" garment="#15604A" hairPath={hair}>
        <Face y={42} mouth="grin" eye="round" />
        {/* Arms raised */}
        <path d="M 44 64 Q 30 56 22 44" stroke={T} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M 76 64 Q 90 56 98 44" stroke={T} strokeWidth="9" fill="none" strokeLinecap="round" />
      </Figure>
      {/* Flowy dress hem */}
      <path d="M 30 150 Q 44 138 60 142 Q 76 138 90 150 L 88 156 Q 74 150 60 153 Q 46 150 32 156 Z" fill="#1C7A5D" opacity="0.5" />
    </Wrap>
  )
}

// ── ASRF: The Laid-Back Optimizer (Cool Minimalist) ───────────────────────────
function CoolMinimalist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <line x1="0" y1="150" x2="120" y2="150" stroke={T} strokeWidth="2" opacity="0.25" />
      <Figure headY={42} hair={HR} garment="#15604A">
        {/* Rectangular shades */}
        <rect x="44" y="38" width="14" height="9" rx="2.5" fill={D} stroke={W} strokeWidth="2.2" />
        <rect x="62" y="38" width="14" height="9" rx="2.5" fill={D} stroke={W} strokeWidth="2.2" />
        <line x1="58" y1="42" x2="62" y2="42" stroke={W} strokeWidth="2.2" />
        <line x1="44" y1="42" x2="39" y2="44" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="76" y1="42" x2="81" y2="44" stroke={W} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="47" y="40" width="5" height="2.5" rx="1.2" fill={W} opacity="0.2" />
        <rect x="65" y="40" width="5" height="2.5" rx="1.2" fill={W} opacity="0.2" />
        {/* Smirk */}
        <path d="M 56 54 Q 64 58 69 53" stroke={D} strokeWidth="2.3" fill="none" strokeLinecap="round" />
        {/* V-neck */}
        <path d="M 52 60 L 60 71 L 68 60" stroke={C3} strokeWidth="2" fill="none" />
        {/* Hands in pockets */}
        <rect x="33" y="120" width="13" height="11" rx="4" fill={T} opacity="0.55" />
        <rect x="74" y="120" width="13" height="11" rx="4" fill={T} opacity="0.55" />
      </Figure>
    </Wrap>
  )
}

// ── PERF: The Focused Climber (Income Maximizer) ──────────────────────────────
function IncomeMaximizer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Rising chart bg */}
      <path d="M 6 140 L 26 120 L 46 128 L 66 102 L 86 90 L 110 60" stroke={T} strokeWidth="2" fill="none" opacity="0.16" strokeLinecap="round" />
      <text x="6" y="36" fontSize="18" fill={G} opacity="0.2" fontWeight="bold">$</text>
      <Figure headY={38} hair={HR} garment="#0E3527">
        {/* Suit lapels + tie */}
        <path d="M 50 60 L 56 78 L 60 64 Z" fill="#143b2c" />
        <path d="M 70 60 L 64 78 L 60 64 Z" fill="#143b2c" />
        <rect x="57.5" y="62" width="5" height="20" rx="2" fill={T} />
        <Face y={38} mouth="smile" eye="round" />
      </Figure>
      {/* Big upward arrow to the side */}
      <path d="M 100 140 L 100 84" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <path d="M 100 84 L 92 96 M 100 84 L 108 96" stroke={G} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </Wrap>
  )
}

// ── PEGB: The Growth Engineer (Efficiency Nerd) ───────────────────────────────
function EfficiencyNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Gear bg */}
      <circle cx="96" cy="26" r="15" fill="none" stroke={T} strokeWidth="2.5" opacity="0.16" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180
        const x = 96 + 17 * Math.cos(rad), y = 26 + 17 * Math.sin(rad)
        return <rect key={a} x={x - 2.5} y={y - 4} width="5" height="8" rx="1" fill={T} opacity="0.16" transform={`rotate(${a} ${x} ${y})`} />
      })}
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="flat" eye="round" />
      </Figure>
      {/* Clipboard held */}
      <rect x="70" y="100" width="34" height="46" rx="3" fill={W} opacity="0.92" />
      <rect x="80" y="95" width="14" height="8" rx="3" fill="#C7D2D0" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="75" y={112 + i * 11} width="6" height="6" rx="1.2" fill={i < 2 ? '#1C7A5D' : 'none'} stroke={i < 2 ? 'none' : '#9AAFAA'} strokeWidth="1.3" />
          {i < 2 && <path d={`M 76 ${115 + i * 11} L 78 ${117 + i * 11} L 80 ${112 + i * 11}`} stroke={W} strokeWidth="1.4" fill="none" strokeLinecap="round" />}
          <line x1="84" y1={115 + i * 11} x2="100" y2={115 + i * 11} stroke="#9AAFAA" strokeWidth="1.4" />
        </g>
      ))}
    </Wrap>
  )
}

// ── ASGB: The Adaptive Creator (Patient Investor) ─────────────────────────────
function PatientInvestor({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Growing tree to the side */}
      <rect x="90" y="70" width="9" height="86" rx="4" fill="#1C7A5D" />
      <ellipse cx="98" cy="64" rx="22" ry="18" fill={T} opacity="0.6" />
      <ellipse cx="104" cy="44" rx="16" ry="14" fill={T} opacity="0.7" />
      <ellipse cx="96" cy="26" rx="11" ry="10" fill={T} opacity="0.8" />
      <ellipse cx="78" cy="78" rx="13" ry="10" fill={T} opacity="0.5" />
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="calm" eye="round" />
      </Figure>
      {/* Watering can */}
      <rect x="14" y="112" width="22" height="17" rx="4" fill="#1C7A5D" opacity="0.85" />
      <path d="M 36 118 Q 46 114 46 122" stroke="#1C7A5D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="14" y="107" width="14" height="7" rx="3" fill="#15604A" />
      <circle cx="48" cy="126" r="2.4" fill={T} opacity="0.6" />
      <circle cx="51" cy="131" r="1.8" fill={T} opacity="0.5" />
      <circle cx="45" cy="131" r="1.8" fill={T} opacity="0.4" />
    </Wrap>
  )
}

// ── PSRB: The Methodical Architect (Blueprint Maker) ──────────────────────────
function BlueprintMaker({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Blueprint grid */}
      {[0, 20, 40, 60, 80, 100, 120].map((x) => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="160" stroke={T} strokeWidth="0.6" opacity="0.07" />)}
      {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((y) => <line key={`h${y}`} x1="0" y1={y} x2="120" y2={y} stroke={T} strokeWidth="0.6" opacity="0.07" />)}
      {/* Plan sketch upper-right */}
      <rect x="70" y="12" width="40" height="30" rx="2" fill="none" stroke={T} strokeWidth="1.3" opacity="0.35" />
      <line x1="80" y1="12" x2="80" y2="42" stroke={T} strokeWidth="1" opacity="0.28" />
      <circle cx="92" cy="22" r="5" fill="none" stroke={T} strokeWidth="1.1" opacity="0.35" />
      {/* Hard hat */}
      <ellipse cx="60" cy="24" rx="26" ry="7" fill={G} opacity="0.92" />
      <path d="M 44 24 Q 46 11 60 11 Q 74 11 76 24 Z" fill={G} />
      <rect x="44" y="21" width="32" height="4" rx="2" fill="#D9990B" opacity="0.7" />
      <Figure headY={44} hair="transparent" garment="#15604A">
        <Face y={44} mouth="flat" eye="round" />
        {/* Pocket */}
        <rect x="50" y="64" width="20" height="12" rx="2" fill={C3} opacity="0.4" />
      </Figure>
      {/* Blueprint scroll held */}
      <rect x="14" y="108" width="36" height="24" rx="2" fill="#BBD7F4" opacity="0.85" />
      <rect x="11" y="108" width="6" height="24" rx="3" fill="#8FBCEC" />
      <rect x="47" y="108" width="6" height="24" rx="3" fill="#8FBCEC" />
      <line x1="20" y1="115" x2="46" y2="115" stroke="#1D5FB8" strokeWidth="1" opacity="0.5" />
      <line x1="20" y1="120" x2="46" y2="120" stroke="#1D5FB8" strokeWidth="1" opacity="0.5" />
      <rect x="20" y="123" width="11" height="6" fill="none" stroke="#1D5FB8" strokeWidth="1" opacity="0.5" />
    </Wrap>
  )
}

// ── PSGF: The Disciplined Escapist (Open-Road Planner) ────────────────────────
function OpenRoadPlanner({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Road perspective */}
      <path d="M 30 160 L 52 96 L 68 96 L 90 160 Z" fill="#0E4634" opacity="0.7" />
      {[100, 116, 132, 148].map((y) => <rect key={y} x="58" y={y} width="4" height="9" rx="2" fill={W} opacity="0.22" />)}
      <rect x="0" y="92" width="120" height="5" rx="2" fill={T} opacity="0.1" />
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="smile" eye="round" />
      </Figure>
      {/* Compass held */}
      <circle cx="92" cy="112" r="17" fill="rgba(6,81,59,0.9)" stroke={T} strokeWidth="2" />
      <circle cx="92" cy="112" r="11" fill={BG} />
      <line x1="92" y1="99" x2="92" y2="112" stroke="#EF4444" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="92" y1="112" x2="92" y2="123" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="81" y1="112" x2="92" y2="112" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="112" x2="103" y2="112" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="112" r="3" fill={W} />
      {/* Map other hand */}
      <rect x="14" y="106" width="28" height="22" rx="2" fill={G} opacity="0.85" />
      <path d="M 19 117 Q 28 110 35 116" stroke="#92400E" strokeWidth="1.4" fill="none" />
      <circle cx="32" cy="113" r="3" fill="#EF4444" />
    </Wrap>
  )
}

// ── ASRB: The Flexible Craftsman (MacGyver) ───────────────────────────────────
function MacGyver({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      <Figure headY={40} garment="#15604A">
        <Face y={40} mouth="smile" eye="round" />
        {/* Tool belt */}
        <rect x="34" y="118" width="52" height="8" rx="3" fill="#C77B16" opacity="0.7" />
        <rect x="55" y="116" width="10" height="12" rx="2" fill="#C77B16" />
      </Figure>
      {/* Wrench raised in hand */}
      <line x1="80" y1="96" x2="104" y2="64" stroke={W} strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <circle cx="106" cy="60" r="12" fill="none" stroke={W} strokeWidth="6" opacity="0.9" />
      <circle cx="106" cy="60" r="5.5" fill={BG} />
      {/* Duct tape on belt */}
      <circle cx="26" cy="116" r="11" fill="#7A8A85" opacity="0.7" />
      <circle cx="26" cy="116" r="6" fill={BG} opacity="0.85" />
      {/* Swiss army knife */}
      <rect x="12" y="92" width="9" height="22" rx="2" fill="#D8453F" opacity="0.85" />
      <rect x="12" y="86" width="9" height="8" rx="1" fill="#C7D2D0" opacity="0.9" />
    </Wrap>
  )
}

// ── AEGF: The Open Adventurer (Wanderer) ──────────────────────────────────────
function Wanderer({ size }: { size: number }) {
  const hair = <path d="M 42 38 Q 44 14 62 12 Q 80 10 86 22 Q 90 30 82 38 Z" fill="#0E4634" />
  return (
    <Wrap size={size}>
      {/* Stars */}
      {[[18, 14], [44, 8], [76, 12], [104, 20], [112, 8], [30, 26]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 2.6 : 1.6} fill={i === 4 ? G : W} opacity={i === 4 ? 0.5 : 0.32} />
      ))}
      <path d="M 0 126 Q 30 118 60 122 Q 90 118 120 126" stroke={T} strokeWidth="1.3" fill="none" opacity="0.18" />
      <Figure headY={42} hair="transparent" garment="#0E4634" hairPath={hair}>
        {/* wind streak */}
        <path d="M 60 18 Q 84 10 96 20" stroke={T} strokeWidth="2.5" fill="none" opacity="0.4" strokeLinecap="round" />
        <Face y={42} mouth="calm" eye="narrow" />
        {/* Jacket zip */}
        <line x1="60" y1="62" x2="60" y2="118" stroke={C3} strokeWidth="2" opacity="0.5" />
      </Figure>
      {/* Compass held */}
      <circle cx="90" cy="116" r="17" fill="rgba(6,81,59,0.9)" stroke={T} strokeWidth="2.2" />
      <circle cx="90" cy="116" r="11" fill={BG} />
      <line x1="90" y1="103" x2="90" y2="116" stroke="#EF4444" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="90" y1="116" x2="90" y2="127" stroke={W} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="79" y1="116" x2="90" y2="116" stroke={W} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="90" y1="116" x2="101" y2="116" stroke={W} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="90" cy="116" r="3" fill={W} />
    </Wrap>
  )
}

// ── Lookup & export ───────────────────────────────────────────────────────────
const CHARS: Record<string, (p: { size: number }) => React.JSX.Element> = {
  PERB: SpreadsheetNerd,
  PEGF: DigitalNomad,
  ASGF: BeachBum,
  PSRF: MinimalistMonk,
  PSGB: ChessPlayer,
  AERB: MadScientist,
  AEGB: SerialHustler,
  AERF: FreeSpirit,
  ASRF: CoolMinimalist,
  PERF: IncomeMaximizer,
  PEGB: EfficiencyNerd,
  ASGB: PatientInvestor,
  PSRB: BlueprintMaker,
  PSGF: OpenRoadPlanner,
  ASRB: MacGyver,
  AEGF: Wanderer,
}

export function FireTypeAvatar({ code, size = 120 }: { code: string; size?: number }) {
  const Char = CHARS[code]
  if (!Char) return null
  return <Char size={size} />
}
