'use client'
import React from 'react'

const T = '#22D3A5'
const D = '#064E3B'
const W = '#FFFFFF'
const G = '#FCD34D'
const BG = '#0B3B2A'
const O = '#F97316'

// Taller viewBox (120×160) so characters are full-body
function Wrap({ size, children }: { size: number; children: React.ReactNode }) {
  const h = Math.round(size * 4 / 3)
  return (
    <svg width={size} height={h} viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="120" height="160" fill={BG} />
      {children}
    </svg>
  )
}

// ── Shared body helpers ───────────────────────────────────────────────────────
// Standard standing body: torso + legs at given y
function Body({ y = 62, color = '#1A5C45', legColor = '#143D30', cx = 60 }: { y?: number; color?: string; legColor?: string; cx?: number }) {
  return (
    <>
      {/* Torso */}
      <rect x={cx - 22} y={y} width="44" height="40" rx="8" fill={color} />
      {/* Legs */}
      <rect x={cx - 20} y={y + 38} width="18" height="36" rx="5" fill={legColor} />
      <rect x={cx + 2} y={y + 38} width="18" height="36" rx="5" fill={legColor} />
      {/* Feet */}
      <rect x={cx - 22} y={y + 70} width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x={cx} y={y + 70} width="22" height="8" rx="4" fill="#0F2E22" />
    </>
  )
}

// ── PERB: The Spreadsheet Nerd ────────────────────────────────────────────────
function SpreadsheetNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Desk surface */}
      <rect x="0" y="138" width="120" height="8" rx="2" fill="#0F2E22" />
      {/* Laptop on desk */}
      <rect x="62" y="106" width="42" height="28" rx="3" fill={W} opacity="0.95" />
      <rect x="64" y="108" width="38" height="22" rx="2" fill={D} />
      {/* Bar chart on screen */}
      <rect x="67" y="118" width="5" height="8" fill={T} />
      <rect x="74" y="115" width="5" height="11" fill={T} />
      <rect x="81" y="112" width="5" height="14" fill={G} />
      <rect x="88" y="110" width="5" height="16" fill={T} />
      <rect x="62" y="134" width="42" height="4" rx="2" fill="#CBD5E1" />
      {/* Hair */}
      <path d="M 38 40 Q 42 22 60 20 Q 78 22 82 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Big round glasses */}
      <circle cx="50" cy="41" r="10" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2.5" />
      <circle cx="70" cy="41" r="10" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2.5" />
      <line x1="60" y1="41" x2="60" y2="41" stroke={W} strokeWidth="2.5" />
      <line x1="40" y1="41" x2="33" y2="45" stroke={W} strokeWidth="2" />
      <line x1="80" y1="41" x2="87" y2="45" stroke={W} strokeWidth="2" />
      <circle cx="50" cy="41" r="5" fill={T} opacity="0.9" />
      <circle cx="70" cy="41" r="5" fill={T} opacity="0.9" />
      <circle cx="48" cy="39" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="39" r="2" fill={W} opacity="0.5" />
      {/* Smirk */}
      <path d="M 52 53 Q 61 58 69 53" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body — suit */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#112B20" />
      <path d="M 52 66 L 58 80 L 46 66" fill="#1A4035" />
      <path d="M 68 66 L 62 80 L 74 66" fill="#1A4035" />
      <polygon points="59,66 63,66 61.5,84 60.5,84" fill={G} />
      {/* Arm reaching to laptop */}
      <rect x="60" y="90" width="32" height="14" rx="6" fill={T} opacity="0.85" />
      {/* Legs */}
      <rect x="40" y="104" width="18" height="34" rx="5" fill="#1A4035" />
      <rect x="62" y="104" width="18" height="34" rx="5" fill="#1A4035" />
      <rect x="38" y="134" width="22" height="8" rx="4" fill="#0F1F18" />
      <rect x="60" y="134" width="22" height="8" rx="4" fill="#0F1F18" />
    </Wrap>
  )
}

// ── PEGF: The Digital Nomad ───────────────────────────────────────────────────
function DigitalNomad({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Plane taking off in bg */}
      <path d="M 60 18 L 100 10 L 96 16 L 108 12 L 80 28 L 76 38 L 66 28 Z" fill={T} opacity="0.18" />
      {/* Gate sign */}
      <rect x="6" y="8" width="30" height="14" rx="3" fill={W} opacity="0.12" />
      <rect x="9" y="11" width="24" height="2" rx="1" fill={W} opacity="0.3" />
      <rect x="9" y="15" width="16" height="2" rx="1" fill={W} opacity="0.2" />
      {/* Hair tousled */}
      <path d="M 36 40 Q 40 22 60 20 Q 80 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Wraparound sunglasses */}
      <rect x="36" y="37" width="20" height="12" rx="5" fill={D} stroke={W} strokeWidth="2" />
      <rect x="64" y="37" width="20" height="12" rx="5" fill={D} stroke={W} strokeWidth="2" />
      <line x1="56" y1="43" x2="64" y2="43" stroke={W} strokeWidth="2" />
      <line x1="36" y1="43" x2="28" y2="46" stroke={W} strokeWidth="1.5" />
      <line x1="84" y1="43" x2="92" y2="46" stroke={W} strokeWidth="1.5" />
      <rect x="40" y="40" width="7" height="3" rx="1" fill={W} opacity="0.2" />
      <rect x="68" y="40" width="7" height="3" rx="1" fill={W} opacity="0.2" />
      {/* Relaxed smile */}
      <path d="M 51 54 Q 60 60 69 54" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body with backpack straps visible */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Backpack straps */}
      <path d="M 50 66 Q 46 84 48 106" stroke={T} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M 70 66 Q 74 84 72 106" stroke={T} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.55" />
      <rect x="52" y="80" width="16" height="10" rx="3" fill={T} opacity="0.25" />
      {/* Boarding pass in left hand */}
      <rect x="6" y="80" width="22" height="14" rx="2" fill={G} opacity="0.9" />
      <rect x="8" y="83" width="18" height="2" rx="1" fill={D} opacity="0.4" />
      <rect x="8" y="87" width="12" height="2" rx="1" fill={D} opacity="0.3" />
      <line x1="20" y1="80" x2="20" y2="94" stroke={D} strokeWidth="1" opacity="0.3" />
      {/* Left arm */}
      <rect x="6" y="72" width="32" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Legs — walking pose */}
      <rect x="38" y="104" width="18" height="36" rx="5" fill="#143D30" />
      <rect x="62" y="108" width="18" height="32" rx="5" fill="#143D30" />
      <rect x="36" y="136" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="136" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── ASGF: The Beach Bum Millionaire ──────────────────────────────────────────
function BeachBum({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Ocean + sun */}
      <circle cx="96" cy="14" r="14" fill={G} opacity="0.18" />
      <path d="M 0 118 Q 20 110 40 118 Q 60 126 80 118 Q 100 110 120 118 L 120 160 L 0 160 Z" fill={T} opacity="0.1" />
      {/* Wide brim hat */}
      <ellipse cx="60" cy="22" rx="40" ry="8" fill={G} />
      <rect x="34" y="14" width="52" height="18" rx="13" fill={G} opacity="0.95" />
      <rect x="28" y="27" width="64" height="5" rx="2" fill="#D97706" opacity="0.7" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Round sunglasses */}
      <circle cx="50" cy="43" r="9" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2" />
      <circle cx="70" cy="43" r="9" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2" />
      <line x1="59" y1="43" x2="61" y2="43" stroke={W} strokeWidth="2" />
      <line x1="41" y1="43" x2="33" y2="46" stroke={W} strokeWidth="1.5" />
      <line x1="79" y1="43" x2="87" y2="46" stroke={W} strokeWidth="1.5" />
      <circle cx="46" cy="40" r="2.5" fill={W} opacity="0.22" />
      <circle cx="66" cy="40" r="2.5" fill={W} opacity="0.22" />
      {/* Big grin */}
      <path d="M 47 55 Q 60 64 73 55" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Floral shirt */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      <circle cx="52" cy="78" r="3" fill={T} opacity="0.45" />
      <circle cx="68" cy="75" r="3" fill={T} opacity="0.45" />
      <circle cx="58" cy="88" r="3" fill={G} opacity="0.35" />
      <circle cx="44" cy="90" r="2.5" fill={T} opacity="0.3" />
      {/* Cocktail in right hand */}
      <rect x="84" y="72" width="14" height="12" rx="6" fill={T} opacity="0.85" />
      <polygon points="104,68 92,68 96,88 100,88" fill={W} opacity="0.85" />
      <rect x="96" y="88" width="4" height="6" fill={W} opacity="0.85" />
      <rect x="92" y="94" width="12" height="2" rx="1" fill={W} opacity="0.85" />
      <line x1="102" y1="66" x2="108" y2="55" stroke={T} strokeWidth="2" strokeLinecap="round" />
      <circle cx="108" cy="54" r="3" fill={T} opacity="0.5" />
      {/* Beach chair legs */}
      <rect x="8" y="100" width="76" height="6" rx="3" fill="#D97706" opacity="0.6" />
      {/* Legs reclined on chair */}
      <rect x="16" y="100" width="18" height="28" rx="5" fill="#143D30" transform="rotate(-10 25 114)" />
      <rect x="38" y="100" width="18" height="28" rx="5" fill="#143D30" transform="rotate(-10 47 114)" />
      <rect x="14" y="124" width="22" height="8" rx="4" fill="#0F2E22" transform="rotate(-10 25 128)" />
      <rect x="36" y="124" width="22" height="8" rx="4" fill="#0F2E22" transform="rotate(-10 47 128)" />
    </Wrap>
  )
}

// ── PSRF: The Minimalist Monk ─────────────────────────────────────────────────
function MinimalistMonk({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Aura rings */}
      <circle cx="60" cy="82" r="72" fill="none" stroke={T} strokeWidth="0.6" opacity="0.08" />
      <circle cx="60" cy="82" r="56" fill="none" stroke={T} strokeWidth="0.8" opacity="0.1" />
      <circle cx="60" cy="82" r="40" fill="none" stroke={T} strokeWidth="1" opacity="0.13" />
      {/* Crown glow */}
      <circle cx="60" cy="14" r="6" fill={G} opacity="0.5" />
      <circle cx="60" cy="14" r="12" fill={G} opacity="0.15" />
      {/* Head */}
      <circle cx="60" cy="40" r="24" fill={T} />
      {/* Closed peaceful eyes */}
      <path d="M 47 38 Q 51 34 55 38" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 65 38 Q 69 34 73 38" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Serene smile */}
      <path d="M 52 51 Q 60 56 68 51" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Robe — wide lotus spread */}
      <path d="M 8 140 Q 20 78 60 70 Q 100 78 112 140 Z" fill="#1A5C45" />
      <path d="M 14 140 Q 28 88 60 82 Q 92 88 106 140" fill="#1A7A5E" opacity="0.4" />
      {/* Arms in mudra */}
      <ellipse cx="34" cy="102" rx="16" ry="7" fill={T} opacity="0.85" transform="rotate(-15 34 102)" />
      <ellipse cx="86" cy="102" rx="16" ry="7" fill={T} opacity="0.85" transform="rotate(15 86 102)" />
      {/* Palms touching hint */}
      <ellipse cx="60" cy="106" rx="10" ry="6" fill={T} opacity="0.6" />
    </Wrap>
  )
}

// ── PSGB: The Chess Player ────────────────────────────────────────────────────
function ChessPlayer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Chess board at bottom */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => [0, 1].map((row) => (
        <rect key={`${col}-${row}`}
          x={col * 15} y={144 + row * 8} width="15" height="8"
          fill={(col + row) % 2 === 0 ? 'rgba(34,211,165,0.18)' : 'rgba(255,255,255,0.06)'} />
      )))}
      {/* Chess king piece */}
      <rect x="86" y="90" width="16" height="24" rx="2" fill={W} opacity="0.88" />
      <rect x="82" y="112" width="24" height="5" rx="2" fill={W} opacity="0.88" />
      <rect x="90" y="80" width="6" height="12" rx="2" fill={W} opacity="0.88" />
      <rect x="86" y="84" width="14" height="5" rx="1" fill={W} opacity="0.88" />
      {/* Hair */}
      <path d="M 36 40 Q 40 22 60 20 Q 80 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Focused eyes — slightly squinted */}
      <ellipse cx="50" cy="40" rx="5" ry="3.5" fill={D} />
      <ellipse cx="70" cy="40" rx="5" ry="3.5" fill={D} />
      <circle cx="48.5" cy="39" r="1.5" fill={W} opacity="0.5" />
      <circle cx="68.5" cy="39" r="1.5" fill={W} opacity="0.5" />
      {/* Thoughtful straight mouth */}
      <line x1="53" y1="53" x2="67" y2="53" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Hand on chin — elbow on table */}
      <rect x="20" y="82" width="24" height="10" rx="5" fill={T} opacity="0.9" />
      <rect x="24" y="66" width="12" height="20" rx="5" fill={T} opacity="0.9" />
      {/* Legs */}
      <rect x="40" y="104" width="18" height="40" rx="5" fill="#143D30" />
      <rect x="62" y="104" width="18" height="40" rx="5" fill="#143D30" />
      <rect x="38" y="140" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="140" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── AERB: The Mad Scientist ───────────────────────────────────────────────────
function MadScientist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Bubbles */}
      <circle cx="86" cy="52" r="3.5" fill={T} opacity="0.4" />
      <circle cx="92" cy="42" r="5" fill={T} opacity="0.28" />
      <circle cx="84" cy="34" r="2.5" fill={T} opacity="0.2" />
      {/* Wild spiky hair */}
      <path d="M 32 42 L 26 18 L 38 32 L 34 12 L 46 28 L 48 10 L 58 26 L 60 8 L 66 26 L 72 10 L 74 28 L 84 14 L 84 36 L 92 20 L 88 42"
        fill={T} opacity="0.85" />
      {/* Head */}
      <circle cx="60" cy="44" r="24" fill={T} />
      {/* Big round goggles */}
      <circle cx="50" cy="42" r="12" fill="rgba(6,78,59,0.65)" stroke={W} strokeWidth="3" />
      <circle cx="70" cy="42" r="12" fill="rgba(6,78,59,0.65)" stroke={W} strokeWidth="3" />
      <rect x="62" y="38" width="8" height="8" fill="none" stroke={W} strokeWidth="2.5" />
      <circle cx="50" cy="42" r="6" fill={T} opacity="0.35" />
      <circle cx="70" cy="42" r="6" fill={T} opacity="0.35" />
      <circle cx="46" cy="38" r="2.5" fill={W} opacity="0.35" />
      <circle cx="66" cy="38" r="2.5" fill={W} opacity="0.35" />
      {/* Excited grin with teeth */}
      <path d="M 46 57 Q 60 67 74 57" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="51" y="57" width="5" height="4" rx="1" fill={W} />
      <rect x="58" y="58" width="5" height="4" rx="1" fill={W} />
      <rect x="65" y="57" width="5" height="4" rx="1" fill={W} />
      {/* Lab coat */}
      <rect x="36" y="68" width="48" height="40" rx="8" fill={W} opacity="0.92" />
      <path d="M 52 68 L 58 82 L 46 68" fill="#DDE8E4" />
      <path d="M 68 68 L 62 82 L 74 68" fill="#DDE8E4" />
      {/* Flask in raised right arm */}
      <rect x="78" y="62" width="14" height="12" rx="6" fill={T} opacity="0.85" />
      <path d="M 88 56 L 84 70 Q 81 84 90 88 Q 99 84 96 70 L 92 56 Z" fill={T} opacity="0.85" stroke={W} strokeWidth="1.5" />
      <rect x="86" y="50" width="10" height="7" rx="3" fill={W} opacity="0.9" />
      {/* Legs */}
      <rect x="40" y="106" width="18" height="36" rx="5" fill="#CBD5E1" />
      <rect x="62" y="106" width="18" height="36" rx="5" fill="#CBD5E1" />
      <rect x="38" y="138" width="22" height="8" rx="4" fill="#94A3B8" />
      <rect x="60" y="138" width="22" height="8" rx="4" fill="#94A3B8" />
    </Wrap>
  )
}

// ── AEGB: The Serial Hustler ──────────────────────────────────────────────────
function SerialHustler({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Lightning bolts */}
      <path d="M 10 24 L 6 40 L 14 40 L 8 58" stroke={G} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 110 16 L 106 32 L 114 32 L 108 50" stroke={G} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 98 110 L 95 122 L 101 122 L 97 132" stroke={G} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Hair */}
      <path d="M 36 40 Q 40 20 60 18 Q 80 20 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Wide-awake big eyes */}
      <circle cx="50" cy="40" r="6" fill={D} />
      <circle cx="70" cy="40" r="6" fill={D} />
      <circle cx="47.5" cy="38" r="2.5" fill={W} opacity="0.6" />
      <circle cx="67.5" cy="38" r="2.5" fill={W} opacity="0.6" />
      {/* Determined grin */}
      <path d="M 50 54 Q 60 60 70 54" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Left phone */}
      <rect x="4" y="68" width="20" height="34" rx="3" fill={W} opacity="0.9" />
      <rect x="6" y="70" width="16" height="28" rx="2" fill={D} />
      <rect x="8" y="74" width="12" height="2" rx="1" fill={T} />
      <rect x="8" y="78" width="8" height="2" rx="1" fill={G} opacity="0.7" />
      <rect x="8" y="82" width="10" height="2" rx="1" fill={T} opacity="0.6" />
      <rect x="8" y="86" width="6" height="2" rx="1" fill={G} opacity="0.5" />
      {/* Right phone */}
      <rect x="96" y="66" width="20" height="34" rx="3" fill={W} opacity="0.9" />
      <rect x="98" y="68" width="16" height="28" rx="2" fill={D} />
      <rect x="100" y="72" width="12" height="2" rx="1" fill={G} />
      <rect x="100" y="76" width="8" height="2" rx="1" fill={T} opacity="0.6" />
      <rect x="100" y="80" width="10" height="2" rx="1" fill={T} opacity="0.5" />
      {/* Third phone angled at top */}
      <g transform="rotate(-15 60 26)">
        <rect x="38" y="10" width="32" height="20" rx="3" fill={W} opacity="0.82" />
        <rect x="40" y="12" width="28" height="16" rx="2" fill={D} />
        <line x1="42" y1="16" x2="66" y2="16" stroke={G} strokeWidth="2.5" />
        <line x1="42" y1="21" x2="58" y2="21" stroke={T} strokeWidth="1.5" opacity="0.6" />
      </g>
      {/* Legs — walking */}
      <rect x="38" y="104" width="18" height="38" rx="5" fill="#143D30" />
      <rect x="62" y="110" width="18" height="32" rx="5" fill="#143D30" />
      <rect x="36" y="138" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="138" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── AERF: The Free Spirit ─────────────────────────────────────────────────────
function FreeSpirit({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Butterfly */}
      <path d="M 88 26 Q 106 14 110 30 Q 104 42 88 34 Z" fill={T} opacity="0.65" />
      <path d="M 88 34 Q 106 44 104 56 Q 95 50 88 42 Z" fill={T} opacity="0.4" />
      <path d="M 88 26 Q 70 14 66 30 Q 72 42 88 34 Z" fill={G} opacity="0.55" />
      <path d="M 88 34 Q 70 44 72 56 Q 81 50 88 42 Z" fill={G} opacity="0.35" />
      <circle cx="88" cy="30" r="3" fill={D} opacity="0.7" />
      <path d="M 86 28 Q 78 18 68 16" stroke={D} strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M 90 28 Q 98 18 108 16" stroke={D} strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* Wild hair flowing */}
      <path d="M 33 44 Q 22 16 40 10 Q 52 6 58 22" fill={T} opacity="0.8" />
      <path d="M 87 44 Q 98 16 80 10 Q 68 6 62 22" fill={T} opacity="0.8" />
      <path d="M 40 26 Q 34 10 52 6 Q 64 4 64 20" fill="#1A7A5E" />
      <path d="M 80 26 Q 86 10 68 6 Q 56 4 56 20" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="44" r="24" fill={T} />
      {/* Bright open eyes */}
      <circle cx="50" cy="42" r="5" fill={D} />
      <circle cx="70" cy="42" r="5" fill={D} />
      <circle cx="48" cy="40" r="2" fill={W} opacity="0.6" />
      <circle cx="68" cy="40" r="2" fill={W} opacity="0.6" />
      {/* Big open smile */}
      <path d="M 46 55 Q 60 66 74 55" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="61" rx="10" ry="4" fill={D} opacity="0.2" />
      {/* Arms spread wide */}
      <rect x="4" y="72" width="34" height="12" rx="6" fill={T} opacity="0.85" />
      <rect x="82" y="72" width="34" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Flowy outfit */}
      <path d="M 36 66 Q 26 90 30 118 L 60 108 L 90 118 Q 94 90 84 66 Z" fill="#1A5C45" />
      {/* Flowing dress/robe hem */}
      <path d="M 28 118 Q 44 108 60 112 Q 76 108 92 118 L 96 145 Q 80 138 60 142 Q 40 138 24 145 Z" fill="#1A7A5E" opacity="0.6" />
    </Wrap>
  )
}

// ── ASRF: The Cool Minimalist ─────────────────────────────────────────────────
function CoolMinimalist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Minimal accent line at bottom */}
      <rect x="0" y="154" width="120" height="6" rx="3" fill={T} opacity="0.08" />
      {/* Slicked-back hair */}
      <path d="M 36 40 Q 42 22 64 22 Q 82 22 84 40" fill="#1A7A5E" />
      <path d="M 36 40 Q 42 24 68 23" stroke={D} strokeWidth="2" fill="none" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Slim rectangular shades */}
      <rect x="36" y="37" width="20" height="11" rx="3" fill={D} stroke={W} strokeWidth="2" />
      <rect x="64" y="37" width="20" height="11" rx="3" fill={D} stroke={W} strokeWidth="2" />
      <line x1="56" y1="42" x2="64" y2="42" stroke={W} strokeWidth="2" />
      <line x1="36" y1="42" x2="28" y2="46" stroke={W} strokeWidth="1.5" />
      <line x1="84" y1="42" x2="92" y2="46" stroke={W} strokeWidth="1.5" />
      <rect x="40" y="40" width="6" height="3" rx="1" fill={W} opacity="0.2" />
      <rect x="68" y="40" width="6" height="3" rx="1" fill={W} opacity="0.2" />
      {/* One-sided smirk */}
      <path d="M 55 54 Q 64 58 70 54" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Clean minimal outfit */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Hands in pockets */}
      <rect x="38" y="96" width="12" height="10" rx="4" fill={T} opacity="0.7" />
      <rect x="70" y="96" width="12" height="10" rx="4" fill={T} opacity="0.7" />
      {/* Simple V detail */}
      <path d="M 52 66 L 60 78 L 68 66" stroke="#22A380" strokeWidth="2" fill="none" />
      {/* Legs — relaxed stance */}
      <rect x="38" y="104" width="18" height="42" rx="5" fill="#0F3D30" />
      <rect x="64" y="104" width="18" height="42" rx="5" fill="#0F3D30" />
      <rect x="36" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="62" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── PERF: The Income Maximizer ────────────────────────────────────────────────
function IncomeMaximizer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Rising chart background */}
      <path d="M 5 140 L 20 120 L 40 128 L 60 100 L 80 88 L 100 64 L 115 48"
        stroke={T} strokeWidth="2" fill="none" opacity="0.14" strokeLinecap="round" />
      {/* Dollar signs floating */}
      <text x="4" y="32" fontSize="20" fill={G} opacity="0.22" fontWeight="bold">$</text>
      <text x="92" y="26" fontSize="16" fill={G} opacity="0.18" fontWeight="bold">$</text>
      {/* Hair — sharp */}
      <path d="M 36 40 Q 42 22 60 20 Q 78 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Confident eyes */}
      <circle cx="50" cy="40" r="4.5" fill={D} />
      <circle cx="70" cy="40" r="4.5" fill={D} />
      <circle cx="48" cy="38" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="38" r="2" fill={W} opacity="0.5" />
      {/* Confident smile */}
      <path d="M 51 53 Q 60 59 69 53" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Sharp suit */}
      <rect x="36" y="66" width="48" height="40" rx="8" fill="#0F2E22" />
      <path d="M 52 66 L 57 80 L 46 66" fill="#1A4035" />
      <path d="M 68 66 L 63 80 L 74 66" fill="#1A4035" />
      <polygon points="59,66 63,66 61.5,84 60.5,84" fill={T} />
      {/* Big upward arrow */}
      <path d="M 96 148 L 96 96" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <path d="M 96 96 L 88 108" stroke={G} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 96 96 L 104 108" stroke={G} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="92" r="6" fill={G} opacity="0.3" />
      {/* Legs — power stance (wider) */}
      <rect x="36" y="104" width="18" height="40" rx="5" fill="#1A4035" />
      <rect x="66" y="104" width="18" height="40" rx="5" fill="#1A4035" />
      <rect x="34" y="140" width="22" height="8" rx="4" fill="#0F1F18" />
      <rect x="64" y="140" width="22" height="8" rx="4" fill="#0F1F18" />
    </Wrap>
  )
}

// ── PEGB: The Efficiency Nerd ─────────────────────────────────────────────────
function EfficiencyNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Big gear background */}
      <circle cx="96" cy="20" r="18" fill="none" stroke={T} strokeWidth="2.5" opacity="0.16" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180
        const x = 96 + 20 * Math.cos(rad)
        const y = 20 + 20 * Math.sin(rad)
        return <rect key={angle} x={x - 3} y={y - 5} width="6" height="10" rx="1" fill={T} opacity="0.16"
          transform={`rotate(${angle} ${x} ${y})`} />
      })}
      {/* Hair */}
      <path d="M 36 40 Q 40 22 60 20 Q 80 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Focused eyes */}
      <circle cx="50" cy="40" r="4.5" fill={D} />
      <circle cx="70" cy="40" r="4.5" fill={D} />
      <circle cx="48" cy="38" r="1.8" fill={W} opacity="0.5" />
      <circle cx="68" cy="38" r="1.8" fill={W} opacity="0.5" />
      {/* Straight mouth — focused */}
      <line x1="52" y1="53" x2="68" y2="53" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Clipboard in right hand */}
      <rect x="80" y="62" width="30" height="42" rx="3" fill={W} opacity="0.92" />
      <rect x="84" y="58" width="22" height="7" rx="3" fill="#CBD5E1" />
      <rect x="90" y="56" width="10" height="7" rx="3" fill="#94A3B8" />
      {/* Checklist */}
      <rect x="84" y="74" width="6" height="6" rx="1" fill="#22A380" />
      <path d="M 85 77 L 87.5 80 L 92 74" stroke={W} strokeWidth="1.5" fill="none" />
      <line x1="93" y1="76" x2="106" y2="76" stroke="#94A3B8" strokeWidth="1.5" />
      <rect x="84" y="84" width="6" height="6" rx="1" fill="#22A380" />
      <path d="M 85 87 L 87.5 90 L 92 84" stroke={W} strokeWidth="1.5" fill="none" />
      <line x1="93" y1="86" x2="106" y2="86" stroke="#94A3B8" strokeWidth="1.5" />
      <rect x="84" y="94" width="6" height="6" rx="1" fill="none" stroke="#94A3B8" strokeWidth="1" />
      <line x1="93" y1="96" x2="106" y2="96" stroke="#94A3B8" strokeWidth="1.5" />
      {/* Right arm holding clipboard */}
      <rect x="68" y="80" width="14" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Legs */}
      <rect x="40" y="104" width="18" height="40" rx="5" fill="#143D30" />
      <rect x="62" y="104" width="18" height="40" rx="5" fill="#143D30" />
      <rect x="38" y="140" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="140" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── ASGB: The Patient Investor ────────────────────────────────────────────────
function PatientInvestor({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Tall growing plant */}
      <path d="M 96 155 Q 94 118 88 96 Q 84 78 90 58" stroke="#22A380" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 90 96 Q 108 84 110 60 Q 96 76 90 96" fill={T} opacity="0.7" />
      <path d="M 91 116 Q 74 104 73 80 Q 88 96 91 116" fill={T} opacity="0.6" />
      <path d="M 89 72 Q 102 56 104 36 Q 94 50 89 72" fill="#22A380" opacity="0.5" />
      <circle cx="90" cy="156" r="5" fill="#1A5C45" />
      {/* Hair */}
      <path d="M 36 40 Q 40 22 60 22 Q 80 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Patient calm eyes */}
      <circle cx="50" cy="40" r="4.5" fill={D} />
      <circle cx="70" cy="40" r="4.5" fill={D} />
      <circle cx="48" cy="38" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="38" r="2" fill={W} opacity="0.5" />
      {/* Peaceful smile */}
      <path d="M 51 53 Q 60 59 69 53" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Watering can in left hand */}
      <rect x="4" y="84" width="26" height="20" rx="5" fill="#22A380" opacity="0.8" />
      <path d="M 30 92 Q 42 86 42 96" stroke="#22A380" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="4" y="78" width="18" height="8" rx="3" fill="#1A7A5E" />
      {/* Water drops */}
      <circle cx="44" cy="100" r="3" fill={T} opacity="0.6" />
      <circle cx="48" cy="106" r="2.5" fill={T} opacity="0.5" />
      <circle cx="40" cy="106" r="2.5" fill={T} opacity="0.4" />
      {/* Left arm */}
      <rect x="6" y="78" width="32" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Legs */}
      <rect x="40" y="104" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="62" y="104" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="38" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── PSRB: The Blueprint Maker ─────────────────────────────────────────────────
function BlueprintMaker({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Ground: construction site */}
      <rect x="0" y="150" width="120" height="10" rx="2" fill="#1A4035" />
      <line x1="0" y1="152" x2="120" y2="152" stroke={G} strokeWidth="1" opacity="0.2" />
      {/* Head */}
      <circle cx="60" cy="44" r="24" fill={T} />
      {/* Hard hat */}
      <ellipse cx="60" cy="24" rx="34" ry="9" fill={G} />
      <rect x="34" y="16" width="52" height="18" rx="13" fill={G} opacity="0.95" />
      <rect x="28" y="29" width="64" height="5" rx="2" fill="#D97706" opacity="0.75" />
      {/* Pencil behind ear */}
      <line x1="83" y1="34" x2="88" y2="46" stroke={G} strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="83,34 81,28 87,30" fill="#D97706" />
      {/* Eyes — precise and focused */}
      <circle cx="50" cy="46" r="4.5" fill={D} />
      <circle cx="70" cy="46" r="4.5" fill={D} />
      <circle cx="48" cy="44" r="1.8" fill={W} opacity="0.5" />
      <circle cx="68" cy="44" r="1.8" fill={W} opacity="0.5" />
      {/* Determined straight mouth */}
      <line x1="52" y1="57" x2="68" y2="57" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Work jacket */}
      <rect x="38" y="68" width="44" height="40" rx="8" fill="#1A5C45" />
      <rect x="50" y="68" width="20" height="14" rx="3" fill="#22A380" opacity="0.4" />
      {/* Blueprint scroll in hands */}
      <rect x="4" y="80" width="36" height="26" rx="3" fill="#BFDBFE" opacity="0.88" />
      <rect x="2" y="80" width="6" height="26" rx="3" fill="#93C5FD" />
      <rect x="34" y="80" width="6" height="26" rx="3" fill="#93C5FD" />
      <line x1="10" y1="88" x2="36" y2="88" stroke="#1D4ED8" strokeWidth="1" opacity="0.55" />
      <line x1="10" y1="92" x2="36" y2="92" stroke="#1D4ED8" strokeWidth="1" opacity="0.55" />
      <line x1="10" y1="96" x2="26" y2="96" stroke="#1D4ED8" strokeWidth="1" opacity="0.55" />
      <rect x="10" y="86" width="12" height="8" fill="none" stroke="#1D4ED8" strokeWidth="1" opacity="0.55" />
      {/* Left arm holding blueprint */}
      <rect x="4" y="74" width="34" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Legs */}
      <rect x="40" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="62" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="38" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── PSGF: The Open-Road Planner ───────────────────────────────────────────────
function OpenRoadPlanner({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Road in background */}
      <path d="M 40 160 L 54 120 L 60 110 L 66 120 L 80 160" fill="#0F3D30" opacity="0.6" />
      <line x1="60" y1="120" x2="60" y2="160" stroke={W} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.2" />
      {/* Hair */}
      <path d="M 36 40 Q 40 20 60 20 Q 80 20 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Curious bright eyes */}
      <circle cx="50" cy="40" r="4.5" fill={D} />
      <circle cx="70" cy="40" r="4.5" fill={D} />
      <circle cx="48" cy="38" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="38" r="2" fill={W} opacity="0.5" />
      {/* Planning smile */}
      <path d="M 51 53 Q 60 59 69 53" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Map in left hand */}
      <rect x="2" y="74" width="36" height="28" rx="2" fill={G} opacity="0.88" />
      <path d="M 8 88 Q 20 80 28 86 Q 36 92 38 102" stroke="#92400E" strokeWidth="1.5" fill="none" />
      <line x1="18" y1="74" x2="18" y2="102" stroke="#D97706" strokeWidth="0.5" opacity="0.5" />
      <line x1="2" y1="88" x2="38" y2="88" stroke="#D97706" strokeWidth="0.5" opacity="0.5" />
      <circle cx="26" cy="84" r="4" fill="#EF4444" />
      <circle cx="26" cy="84" r="2" fill={W} />
      {/* Left arm */}
      <rect x="2" y="68" width="36" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Compass in right hand */}
      <rect x="82" y="68" width="12" height="26" rx="6" fill={T} opacity="0.85" />
      <circle cx="92" cy="96" r="18" fill="rgba(6,78,59,0.9)" stroke={T} strokeWidth="2" />
      <circle cx="92" cy="96" r="12" fill={BG} />
      <line x1="92" y1="82" x2="92" y2="96" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="96" x2="92" y2="108" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="80" y1="96" x2="92" y2="96" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="96" x2="104" y2="96" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="96" r="3" fill={W} />
      {/* Legs */}
      <rect x="40" y="104" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="62" y="104" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="38" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="142" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── ASRB: The MacGyver ────────────────────────────────────────────────────────
function MacGyver({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Hair */}
      <path d="M 36 40 Q 40 22 60 20 Q 80 22 84 40" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="42" r="24" fill={T} />
      {/* Resourceful eyes */}
      <circle cx="50" cy="40" r="4.5" fill={D} />
      <circle cx="70" cy="40" r="4.5" fill={D} />
      <circle cx="48" cy="38" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="38" r="2" fill={W} opacity="0.5" />
      {/* Confident half-smirk */}
      <path d="M 52 53 Q 62 58 70 53" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Work shirt */}
      <rect x="38" y="66" width="44" height="40" rx="8" fill="#1A5C45" />
      {/* Utility belt */}
      <rect x="38" y="100" width="44" height="8" rx="3" fill="#D97706" opacity="0.7" />
      <rect x="56" y="99" width="10" height="10" rx="2" fill="#D97706" />
      {/* Big wrench raised in right arm */}
      <rect x="78" y="62" width="14" height="12" rx="6" fill={T} opacity="0.85" />
      <line x1="88" y1="62" x2="112" y2="30" stroke={W} strokeWidth="7" strokeLinecap="round" opacity="0.9" />
      <circle cx="108" cy="24" r="13" fill="none" stroke={W} strokeWidth="6" opacity="0.9" />
      <circle cx="108" cy="24" r="6" fill={BG} />
      {/* Duct tape roll on belt */}
      <circle cx="26" cy="100" r="12" fill="#9CA3AF" opacity="0.7" />
      <circle cx="26" cy="100" r="7" fill={BG} opacity="0.85" />
      <circle cx="26" cy="100" r="4" fill="#6B7280" opacity="0.5" />
      {/* Swiss army knife */}
      <rect x="8" y="80" width="10" height="26" rx="2" fill="#EF4444" opacity="0.85" />
      <rect x="8" y="74" width="10" height="10" rx="1" fill="#CBD5E1" opacity="0.9" />
      {/* Legs */}
      <rect x="40" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="62" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="38" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="60" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
    </Wrap>
  )
}

// ── AEGF: The Wanderer ────────────────────────────────────────────────────────
function Wanderer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Stars */}
      <circle cx="16" cy="16" r="2" fill={W} opacity="0.4" />
      <circle cx="42" cy="8" r="2" fill={W} opacity="0.4" />
      <circle cx="74" cy="12" r="2" fill={W} opacity="0.4" />
      <circle cx="104" cy="20" r="2" fill={W} opacity="0.4" />
      <circle cx="112" cy="8" r="3" fill={G} opacity="0.5" />
      <circle cx="30" cy="28" r="1.5" fill={W} opacity="0.3" />
      {/* Horizon glow */}
      <path d="M 0 128 Q 30 118 60 122 Q 90 118 120 128" stroke={T} strokeWidth="1" fill="none" opacity="0.14" />
      {/* Wind-blown hair */}
      <path d="M 36 44 Q 38 18 58 16 Q 74 12 92 20 Q 100 26 92 38" fill="#1A7A5E" />
      <path d="M 60 18 Q 84 10 100 20 Q 108 26 100 36" fill={T} opacity="0.45" />
      {/* Head */}
      <circle cx="60" cy="44" r="24" fill={T} />
      {/* Far-off gaze — slight squint looking out */}
      <ellipse cx="50" cy="42" rx="5" ry="3.5" fill={D} />
      <ellipse cx="70" cy="42" rx="5" ry="3.5" fill={D} />
      <circle cx="49" cy="41" r="1.8" fill={W} opacity="0.5" />
      <circle cx="69" cy="41" r="1.8" fill={W} opacity="0.5" />
      {/* Content small smile */}
      <path d="M 53 55 Q 60 60 67 55" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Jacket */}
      <rect x="36" y="68" width="48" height="40" rx="8" fill="#0F3D30" />
      <line x1="48" y1="68" x2="46" y2="108" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="72" y1="68" x2="74" y2="108" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      {/* Compass in hand */}
      <rect x="82" y="72" width="12" height="26" rx="6" fill={T} opacity="0.85" />
      <circle cx="92" cy="102" r="16" fill="rgba(6,78,59,0.9)" stroke={T} strokeWidth="2" />
      <circle cx="92" cy="102" r="10" fill={BG} />
      <line x1="92" y1="90" x2="92" y2="102" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="102" x2="92" y2="112" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="102" x2="92" y2="102" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="102" x2="102" y2="102" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="102" r="2.5" fill={W} />
      {/* Legs */}
      <rect x="38" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="64" y="106" width="18" height="42" rx="5" fill="#143D30" />
      <rect x="36" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
      <rect x="62" y="144" width="22" height="8" rx="4" fill="#0F2E22" />
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
