'use client'
import React from 'react'

const T  = '#22D3A5'  // teal — main figure
const D  = '#064E3B'  // dark teal — shadows / detail
const W  = '#FFFFFF'  // white
const G  = '#FCD34D'  // gold
const BG = '#0B3B2A'  // dark background
const MG = '#0F3D2E'  // mid-green (surface / desk)

function Wrap({ size, children }: { size: number; children: React.ReactNode }) {
  const h = Math.round(size * 4 / 3)
  return (
    <svg width={size} height={h} viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="120" height="160" fill={BG} />
      {children}
    </svg>
  )
}

// Clean geometric head + minimal face at (cx, cy, r)
function Head({ cx = 60, cy = 38, r = 20, hairColor = D }: { cx?: number; cy?: number; r?: number; hairColor?: string }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={T} />
      {/* Hair block */}
      <ellipse cx={cx} cy={cy - r + 4} rx={r} ry={8} fill={hairColor} />
      {/* Eyes */}
      <circle cx={cx - 6} cy={cy - 1} r={3} fill={D} />
      <circle cx={cx + 6} cy={cy - 1} r={3} fill={D} />
      <circle cx={cx - 7.5} cy={cy - 2.5} r={1} fill={W} opacity={0.5} />
      <circle cx={cx + 4.5} cy={cy - 2.5} r={1} fill={W} opacity={0.5} />
    </>
  )
}

// Geometric standing body (no head)
function Body({ y = 58, w = 36, legColor = D }: { y?: number; w?: number; legColor?: string }) {
  const hw = w / 2
  return (
    <>
      {/* Torso */}
      <path d={`M ${60 - hw + 4} ${y} L ${60 - hw} ${y + 42} L ${60 + hw} ${y + 42} L ${60 + hw - 4} ${y} Z`} fill={MG} />
      {/* Legs */}
      <rect x={60 - hw + 2} y={y + 40} width={hw - 4} height={44} rx={5} fill={legColor} />
      <rect x={60 + 2} y={y + 40} width={hw - 4} height={44} rx={5} fill={legColor} />
      {/* Feet */}
      <rect x={60 - hw} y={y + 80} width={hw + 2} height={7} rx={3} fill={D} />
      <rect x={60 + 2} y={y + 80} width={hw + 2} height={7} rx={3} fill={D} />
    </>
  )
}

// ── PERB: The Spreadsheet Nerd ────────────────────────────────────────────────
function SpreadsheetNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant laptop — hero prop */}
      <rect x="4" y="90" width="112" height="62" rx="5" fill={MG} />
      <rect x="7" y="93" width="106" height="54" rx="3" fill={D} />
      {/* Chart on screen */}
      <rect x="14" y="114" width="10" height="28" rx="2" fill={T} opacity="0.4" />
      <rect x="28" y="106" width="10" height="36" rx="2" fill={T} opacity="0.6" />
      <rect x="42" y="98" width="10" height="44" rx="2" fill={T} opacity="0.8" />
      <rect x="56" y="102" width="10" height="40" rx="2" fill={T} />
      <rect x="70" y="108" width="10" height="34" rx="2" fill={G} />
      <rect x="84" y="96" width="10" height="46" rx="2" fill={G} opacity="0.8" />
      {/* Baseline */}
      <line x1="11" y1="142" x2="107" y2="142" stroke={T} strokeWidth="1" opacity="0.4" />
      {/* Laptop base */}
      <rect x="0" y="150" width="120" height="8" rx="4" fill={D} />

      {/* Character — bust above laptop */}
      <Head cy={42} />
      {/* BIG round glasses over face */}
      <circle cx="49" cy="41" r="12" fill="rgba(6,78,59,0.75)" stroke={W} strokeWidth="3" />
      <circle cx="71" cy="41" r="12" fill="rgba(6,78,59,0.75)" stroke={W} strokeWidth="3" />
      <rect x="61" y="37" width="10" height="8" fill="none" stroke={W} strokeWidth="2.5" />
      <line x1="37" y1="41" x2="30" y2="44" stroke={W} strokeWidth="2.5" />
      <line x1="83" y1="41" x2="90" y2="44" stroke={W} strokeWidth="2.5" />
      {/* Smirk */}
      <path d="M 54 52 Q 62 57 70 52" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Torso (suit) */}
      <path d="M 40 62 L 37 92 L 83 92 L 80 62 Z" fill="#0F2E22" />
      <path d="M 52 62 L 58 76 L 46 62" fill={D} />
      <path d="M 68 62 L 62 76 L 74 62" fill={D} />
      <rect x="58" y="62" width="4" height="22" rx="2" fill={G} />
    </Wrap>
  )
}

// ── PEGF: The Digital Nomad ───────────────────────────────────────────────────
function DigitalNomad({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Big boarding pass — hero prop */}
      <rect x="8" y="100" width="104" height="54" rx="6" fill={G} opacity="0.95" />
      <rect x="8" y="128" width="104" height="1" stroke={D} strokeWidth="1" fill="none" strokeDasharray="4 3" />
      <rect x="72" y="100" width="2" height="54" fill={D} opacity="0.2" />
      {/* Pass text lines */}
      <rect x="16" y="108" width="40" height="4" rx="2" fill={D} opacity="0.35" />
      <rect x="16" y="116" width="28" height="4" rx="2" fill={D} opacity="0.25" />
      <rect x="16" y="134" width="20" height="3" rx="1" fill={D} opacity="0.2" />
      <rect x="16" y="140" width="32" height="3" rx="1" fill={D} opacity="0.2" />
      {/* Barcode */}
      {[80, 84, 88, 91, 95, 99, 103].map((x, i) => (
        <rect key={i} x={x} y="108" width={i % 3 === 0 ? 2 : 1} height="16" rx="0.5" fill={D} opacity="0.4" />
      ))}
      {/* Plane icon */}
      <path d="M 80 138 L 104 132 L 100 136 L 108 134 L 90 146 L 86 142 Z" fill={D} opacity="0.3" />

      {/* Character */}
      {/* Sunglasses hair */}
      <Head cy={36} hairColor="#1A5C45" />
      {/* Wraparound shades */}
      <rect x="36" y="30" width="18" height="11" rx="4" fill={D} stroke={W} strokeWidth="2.5" />
      <rect x="66" y="30" width="18" height="11" rx="4" fill={D} stroke={W} strokeWidth="2.5" />
      <line x1="54" y1="35" x2="66" y2="35" stroke={W} strokeWidth="2.5" />
      <line x1="36" y1="35" x2="28" y2="38" stroke={W} strokeWidth="2" />
      <line x1="84" y1="35" x2="92" y2="38" stroke={W} strokeWidth="2" />
      <rect x="40" y="32" width="7" height="4" rx="2" fill={W} opacity="0.18" />
      <rect x="70" y="32" width="7" height="4" rx="2" fill={W} opacity="0.18" />
      {/* Easy smile */}
      <path d="M 52 47 Q 60 53 68 47" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body + backpack straps */}
      <path d="M 42 56 L 38 100 L 82 100 L 78 56 Z" fill="#1A5C45" />
      <path d="M 50 56 Q 46 76 48 100" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M 70 56 Q 74 76 72 100" stroke={T} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" />
    </Wrap>
  )
}

// ── ASGF: The Beach Bum Millionaire ──────────────────────────────────────────
function BeachBum({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Sun */}
      <circle cx="96" cy="18" r="18" fill={G} opacity="0.15" />
      <circle cx="96" cy="18" r="12" fill={G} opacity="0.25" />
      {/* Ocean floor */}
      <path d="M 0 130 Q 30 122 60 128 Q 90 122 120 130 L 120 160 L 0 160 Z" fill={D} opacity="0.5" />
      {/* Wave lines */}
      <path d="M 4 134 Q 22 128 40 134" stroke={T} strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M 50 138 Q 68 132 86 138" stroke={T} strokeWidth="1.5" fill="none" opacity="0.4" />

      {/* Giant cocktail — hero */}
      <polygon points="8,56 36,56 26,102 18,102" fill={T} opacity="0.85" />
      <rect x="18" y="102" width="8" height="12" rx="2" fill={T} opacity="0.85" />
      <rect x="12" y="114" width="20" height="4" rx="2" fill={T} opacity="0.85" />
      {/* Liquid level */}
      <polygon points="10,68 34,68 31,86 13,86" fill={T} opacity="0.4" />
      {/* Straw */}
      <line x1="34" y1="58" x2="44" y2="36" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      {/* Umbrella */}
      <path d="M 44 36 Q 50 28 62 36 Q 56 38 50 36 Z" fill={G} opacity="0.85" />
      <path d="M 44 36 Q 38 28 26 36 Q 32 38 38 36 Z" fill={G} opacity="0.65" />

      {/* Character — wide brim hat then head */}
      <ellipse cx="76" cy="32" rx="32" ry="8" fill={G} opacity="0.9" />
      <rect x="50" y="24" width="52" height="18" rx="11" fill={G} opacity="0.95" />
      <rect x="46" y="37" width="60" height="4" rx="2" fill="#D97706" opacity="0.7" />
      {/* Head under hat */}
      <circle cx="76" cy="50" r="18" fill={T} />
      {/* Round shades */}
      <circle cx="68" cy="50" r="9" fill={D} stroke={W} strokeWidth="2.5" />
      <circle cx="84" cy="50" r="9" fill={D} stroke={W} strokeWidth="2.5" />
      <line x1="77" y1="50" x2="75" y2="50" stroke={W} strokeWidth="2.5" />
      <line x1="59" y1="50" x2="53" y2="53" stroke={W} strokeWidth="2" />
      <line x1="93" y1="50" x2="99" y2="53" stroke={W} strokeWidth="2" />
      {/* Big grin */}
      <path d="M 65 61 Q 76 69 87 61" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Torso reclining */}
      <path d="M 56 68 L 54 126 L 98 126 L 96 68 Z" fill="#1A5C45" />
    </Wrap>
  )
}

// ── PSRF: The Minimalist Monk ─────────────────────────────────────────────────
function MinimalistMonk({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Enso circle — hero prop, huge */}
      <circle cx="60" cy="82" r="66" fill="none" stroke={T} strokeWidth="3" opacity="0.08" />
      <circle cx="60" cy="82" r="52" fill="none" stroke={T} strokeWidth="4" opacity="0.12" />
      <circle cx="60" cy="82" r="38" fill="none" stroke={T} strokeWidth="6" opacity="0.18" />
      {/* Crown glow */}
      <circle cx="60" cy="10" r="8" fill={G} opacity="0.45" />
      <circle cx="60" cy="10" r="16" fill={G} opacity="0.12" />
      {/* Clean head */}
      <circle cx="60" cy="40" r="20" fill={T} />
      {/* No hair — shaved */}
      {/* Peaceful closed eyes */}
      <path d="M 48 38 Q 52 34 56 38" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 64 38 Q 68 34 72 38" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Serene smile */}
      <path d="M 53 49 Q 60 54 67 49" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Lotus robe — wide geometric spread */}
      <path d="M 6 155 Q 18 82 60 72 Q 102 82 114 155 Z" fill="#1A5C45" />
      <path d="M 12 155 Q 26 94 60 86 Q 94 94 108 155" fill="#22735A" opacity="0.4" />
      {/* Hands in mudra */}
      <ellipse cx="38" cy="106" rx="14" ry="7" fill={T} opacity="0.8" transform="rotate(-16 38 106)" />
      <ellipse cx="82" cy="106" rx="14" ry="7" fill={T} opacity="0.8" transform="rotate(16 82 106)" />
    </Wrap>
  )
}

// ── PSGB: The Chess Player ────────────────────────────────────────────────────
function ChessPlayer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Chess board — hero surface */}
      {Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => (
          <rect key={`${row}-${col}`}
            x={col * 15} y={132 + row * 8} width="15" height="8"
            fill={(col + row) % 2 === 0 ? 'rgba(34,211,165,0.18)' : 'rgba(255,255,255,0.05)'} />
        ))
      )}

      {/* Giant chess king — hero prop */}
      <rect x="76" y="72" width="36" height="54" rx="3" fill={W} opacity="0.88" />
      <rect x="72" y="120" width="44" height="8" rx="4" fill={W} opacity="0.88" />
      {/* King crown */}
      <rect x="88" y="56" width="12" height="20" rx="3" fill={W} opacity="0.88" />
      <rect x="76" y="64" width="36" height="10" rx="3" fill={W} opacity="0.88" />
      <circle cx="94" cy="56" r="4" fill={G} opacity="0.8" />

      {/* Character — thinking pose left side */}
      <Head cx={44} cy={40} />
      {/* Thoughtful narrow eyes (override) */}
      <ellipse cx="37" cy="39" rx="5" ry="3" fill={D} />
      <ellipse cx="51" cy="39" rx="5" ry="3" fill={D} />
      {/* Straight mouth */}
      <line x1="36" y1="50" x2="52" y2="50" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Hand on chin */}
      <rect x="26" y="56" width="26" height="12" rx="5" fill={T} opacity="0.85" />
      <rect x="32" y="44" width="12" height="18" rx="5" fill={T} opacity="0.85" />
      {/* Body */}
      <path d="M 24 68 L 22 132 L 66 132 L 64 68 Z" fill="#1A5C45" />
    </Wrap>
  )
}

// ── AERB: The Mad Scientist ───────────────────────────────────────────────────
function MadScientist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant bubbling flask — hero prop */}
      <path d="M 62 8 L 58 38 Q 52 56 34 72 Q 18 88 22 110 Q 26 136 60 140 Q 94 136 98 110 Q 102 88 86 72 Q 68 56 62 38 L 58 8 Z"
        fill={T} opacity="0.2" stroke={T} strokeWidth="2" />
      <path d="M 62 8 L 58 38 Q 52 56 34 72 Q 18 88 22 110 Q 26 136 60 140 Q 94 136 98 110 Q 102 80 78 62 Q 66 54 62 38 L 58 8 Z"
        fill={T} opacity="0.3" />
      {/* Liquid inside */}
      <path d="M 28 116 Q 60 108 92 116 Q 96 136 60 140 Q 24 136 28 116 Z"
        fill={T} opacity="0.7" />
      {/* Bubbles */}
      <circle cx="44" cy="106" r="4" fill={T} opacity="0.4" />
      <circle cx="72" cy="96" r="6" fill={T} opacity="0.3" />
      <circle cx="56" cy="86" r="3" fill={T} opacity="0.35" />
      <circle cx="80" cy="112" r="5" fill={T} opacity="0.35" />
      {/* Flask neck */}
      <rect x="53" y="4" width="14" height="36" rx="4" fill={D} opacity="0.7" />

      {/* Character — bust in lower right area */}
      {/* Wild spiky hair */}
      <path d="M 10 44 L 4 24 L 14 34 L 12 18 L 22 30 L 22 14 L 32 28 L 34 12 L 40 26 L 44 14"
        fill={T} opacity="0.75" />
      <Head cx={30} cy={52} r={18} hairColor="transparent" />
      {/* Big goggles */}
      <circle cx="23" cy="50" r="10" fill="rgba(6,78,59,0.75)" stroke={W} strokeWidth="3" />
      <circle cx="37" cy="50" r="10" fill="rgba(6,78,59,0.75)" stroke={W} strokeWidth="3" />
      <rect x="33" y="46" width="4" height="8" fill="none" stroke={W} strokeWidth="2.5" />
      <circle cx="20" cy="47" r="2.5" fill={W} opacity="0.3" />
      {/* Grin */}
      <path d="M 19 62 Q 30 70 41 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Lab coat */}
      <path d="M 10 70 L 8 145 L 52 145 L 50 70 Z" fill={W} opacity="0.88" />
      <path d="M 22 70 L 28 84 L 16 70" fill="#DDE8E4" />
      <path d="M 38 70 L 32 84 L 44 70" fill="#DDE8E4" />
    </Wrap>
  )
}

// ── AEGB: The Serial Hustler ──────────────────────────────────────────────────
function SerialHustler({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Lightning bolt hero */}
      <path d="M 68 6 L 44 68 L 62 68 L 38 154 L 86 76 L 64 76 L 90 6 Z" fill={G} opacity="0.18" />

      {/* Three phones — hero arrangement */}
      {/* Left phone tilted */}
      <g transform="rotate(-18 20 90)">
        <rect x="6" y="62" width="28" height="52" rx="5" fill={W} opacity="0.88" />
        <rect x="9" y="65" width="22" height="44" rx="3" fill={D} />
        <rect x="11" y="70" width="18" height="3" rx="1" fill={T} />
        <rect x="11" y="76" width="12" height="3" rx="1" fill={G} opacity="0.6" />
        <rect x="11" y="82" width="16" height="3" rx="1" fill={T} opacity="0.5" />
        <circle cx="20" cy="101" r="4" fill="#1A4035" />
      </g>
      {/* Center phone */}
      <rect x="46" y="84" width="28" height="52" rx="5" fill={W} opacity="0.95" />
      <rect x="49" y="87" width="22" height="44" rx="3" fill={D} />
      <rect x="51" y="92" width="18" height="3" rx="1" fill={G} />
      <rect x="51" y="98" width="12" height="3" rx="1" fill={T} opacity="0.6" />
      <rect x="51" y="104" width="16" height="3" rx="1" fill={T} opacity="0.5" />
      <circle cx="60" cy="122" r="5" fill="#1A4035" />
      {/* Right phone tilted */}
      <g transform="rotate(18 100 90)">
        <rect x="86" y="62" width="28" height="52" rx="5" fill={W} opacity="0.88" />
        <rect x="89" y="65" width="22" height="44" rx="3" fill={D} />
        <rect x="91" y="70" width="18" height="3" rx="1" fill={T} />
        <rect x="91" y="76" width="12" height="3" rx="1" fill={G} opacity="0.6" />
        <rect x="91" y="82" width="16" height="3" rx="1" fill={T} opacity="0.5" />
        <circle cx="100" cy="101" r="4" fill="#1A4035" />
      </g>

      {/* Character bust above phones */}
      <Head cy={38} />
      {/* Wide-awake eyes (override) */}
      <circle cx="54" cy="37" r="5" fill={D} />
      <circle cx="66" cy="37" r="5" fill={D} />
      <circle cx="52" cy="35" r="2" fill={W} opacity="0.55" />
      <circle cx="64" cy="35" r="2" fill={W} opacity="0.55" />
      {/* Determined grin */}
      <path d="M 50 49 Q 60 56 70 49" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Torso */}
      <path d="M 38 58 L 34 84 L 86 84 L 82 58 Z" fill="#1A5C45" />
    </Wrap>
  )
}

// ── AERF: The Free Spirit ─────────────────────────────────────────────────────
function FreeSpirit({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant butterfly — hero */}
      <path d="M 60 70 Q 100 40 110 60 Q 106 84 60 80 Z" fill={T} opacity="0.55" />
      <path d="M 60 80 Q 108 88 106 108 Q 90 104 60 90 Z" fill={T} opacity="0.35" />
      <path d="M 60 70 Q 20 40 10 60 Q 14 84 60 80 Z" fill={G} opacity="0.5" />
      <path d="M 60 80 Q 12 88 14 108 Q 30 104 60 90 Z" fill={G} opacity="0.3" />
      <ellipse cx="60" cy="75" rx="4" ry="8" fill={D} opacity="0.6" />
      {/* Antennae */}
      <path d="M 58 68 Q 46 52 40 44" stroke={D} strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M 62 68 Q 74 52 80 44" stroke={D} strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="40" cy="44" r="3" fill={D} opacity="0.4" />
      <circle cx="80" cy="44" r="3" fill={D} opacity="0.4" />

      {/* Character — arms wide */}
      {/* Wild hair */}
      <path d="M 36 40 Q 30 16 44 12 Q 56 8 58 24" fill={T} opacity="0.7" />
      <path d="M 84 40 Q 90 16 76 12 Q 64 8 62 24" fill={T} opacity="0.7" />
      <Head cy={40} hairColor="transparent" />
      {/* Bright open smile */}
      <path d="M 49 51 Q 60 59 71 51" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Arms spread */}
      <rect x="2" y="60" width="36" height="12" rx="6" fill={T} opacity="0.85" />
      <rect x="82" y="60" width="36" height="12" rx="6" fill={T} opacity="0.85" />
      {/* Flowing dress */}
      <path d="M 38 62 Q 28 94 32 140 L 60 128 L 88 140 Q 92 94 82 62 Z" fill="#1A5C45" />
      <path d="M 30 140 Q 44 130 60 134 Q 76 130 90 140 L 94 158 Q 76 150 60 154 Q 44 150 26 158 Z"
        fill="#1A7A5E" opacity="0.5" />
    </Wrap>
  )
}

// ── ASRF: The Cool Minimalist ─────────────────────────────────────────────────
function CoolMinimalist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Single thin accent line — minimal is the point */}
      <line x1="0" y1="152" x2="120" y2="152" stroke={T} strokeWidth="2" opacity="0.3" />

      {/* Slicked hair */}
      <ellipse cx="62" cy="20" rx="22" ry="6" fill={D} />
      <Head cy={38} hairColor="transparent" />
      {/* Cool rectangular shades */}
      <rect x="36" y="32" width="18" height="10" rx="2.5" fill={D} stroke={W} strokeWidth="2.5" />
      <rect x="66" y="32" width="18" height="10" rx="2.5" fill={D} stroke={W} strokeWidth="2.5" />
      <line x1="54" y1="37" x2="66" y2="37" stroke={W} strokeWidth="2.5" />
      <line x1="36" y1="37" x2="28" y2="40" stroke={W} strokeWidth="2" />
      <line x1="84" y1="37" x2="92" y2="40" stroke={W} strokeWidth="2" />
      {/* Glare on lenses */}
      <rect x="40" y="34" width="5" height="3" rx="1.5" fill={W} opacity="0.2" />
      <rect x="70" y="34" width="5" height="3" rx="1.5" fill={W} opacity="0.2" />
      {/* One-side smirk */}
      <path d="M 56 49 Q 65 53 70 49" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Clean slim body */}
      <path d="M 44 58 L 42 152 L 78 152 L 76 58 Z" fill="#1A5C45" />
      {/* V-neck */}
      <path d="M 52 58 L 60 70 L 68 58" stroke={T} strokeWidth="2" fill="none" />
      {/* Hands in pockets */}
      <rect x="42" y="118" width="14" height="12" rx="4" fill={T} opacity="0.65" />
      <rect x="64" y="118" width="14" height="12" rx="4" fill={T} opacity="0.65" />
    </Wrap>
  )
}

// ── PERF: The Income Maximizer ────────────────────────────────────────────────
function IncomeMaximizer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant upward arrow — hero prop, bold */}
      <polygon points="60,8 90,52 74,52 74,155 46,155 46,52 30,52" fill={G} opacity="0.92" />
      {/* Dollar overlay on arrow */}
      <text x="51" y="118" fontSize="22" fill={BG} opacity="0.5" fontWeight="900" fontFamily="monospace">$</text>

      {/* Character — suit, stands in front */}
      <Head cy={40} hairColor={D} />
      {/* Confident eyes override */}
      <circle cx="54" cy="39" r="4" fill={D} />
      <circle cx="66" cy="39" r="4" fill={D} />
      <circle cx="52.5" cy="37.5" r="1.5" fill={W} opacity="0.5" />
      <circle cx="64.5" cy="37.5" r="1.5" fill={W} opacity="0.5" />
      {/* Smile */}
      <path d="M 52 50 Q 60 56 68 50" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Sharp dark suit over the arrow */}
      <path d="M 42 60 L 40 154 L 80 154 L 78 60 Z" fill="#0A1E18" opacity="0.88" />
      <path d="M 52 60 L 58 76 L 46 60" fill="#112820" />
      <path d="M 68 60 L 62 76 L 74 60" fill="#112820" />
      {/* Teal tie */}
      <polygon points="58,60 62,60 61,82 59,82" fill={T} />
    </Wrap>
  )
}

// ── PEGB: The Efficiency Nerd ─────────────────────────────────────────────────
function EfficiencyNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant gear — hero, background */}
      <circle cx="72" cy="88" r="58" fill="none" stroke={T} strokeWidth="4" opacity="0.16" />
      <circle cx="72" cy="88" r="44" fill="none" stroke={T} strokeWidth="3" opacity="0.1" />
      <circle cx="72" cy="88" r="26" fill={D} opacity="0.4" />
      {/* Gear teeth */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180
        const cx2 = 72 + 56 * Math.cos(rad)
        const cy2 = 88 + 56 * Math.sin(rad)
        return <rect key={angle} x={cx2 - 5} y={cy2 - 9} width="10" height="18" rx="2"
          fill={T} opacity="0.16" transform={`rotate(${angle} ${cx2} ${cy2})`} />
      })}

      {/* Character left side */}
      <Head cx={40} cy={38} r={18} />
      {/* Focused eyes override */}
      <circle cx="34" cy="37" r="3.5" fill={D} />
      <circle cx="46" cy="37" r="3.5" fill={D} />
      {/* Straight mouth */}
      <line x1="34" y1="47" x2="46" y2="47" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Body */}
      <path d="M 20 56 L 18 130 L 62 130 L 60 56 Z" fill="#1A5C45" />

      {/* Clipboard — bold, right side */}
      <rect x="64" y="56" width="44" height="66" rx="4" fill={W} opacity="0.92" />
      <rect x="74" y="50" width="24" height="10" rx="4" fill="#CBD5E1" />
      <rect x="80" y="48" width="12" height="10" rx="4" fill="#94A3B8" />
      {/* Checklist items */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="70" y={70 + i * 14} width="8" height="8" rx="1.5"
            fill={i < 2 ? '#22A380' : 'none'} stroke={i < 2 ? 'none' : '#94A3B8'} strokeWidth="1.5" />
          {i < 2 && <path d={`M ${71} ${74 + i * 14} L ${74} ${77 + i * 14} L ${79} ${70 + i * 14}`}
            stroke={W} strokeWidth="2" fill="none" strokeLinecap="round" />}
          <line x1="82" y1={74 + i * 14} x2="104" y2={74 + i * 14} stroke="#94A3B8" strokeWidth="1.5" />
        </g>
      ))}
    </Wrap>
  )
}

// ── ASGB: The Patient Investor ────────────────────────────────────────────────
function PatientInvestor({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Massive growing tree — hero */}
      {/* Trunk */}
      <rect x="56" y="64" width="14" height="94" rx="6" fill="#22735A" />
      {/* Canopy layers */}
      <ellipse cx="74" cy="60" rx="32" ry="26" fill={T} opacity="0.65" />
      <ellipse cx="82" cy="38" rx="24" ry="20" fill={T} opacity="0.75" />
      <ellipse cx="72" cy="18" rx="16" ry="14" fill={T} opacity="0.85" />
      {/* Branch leaves */}
      <ellipse cx="42" cy="78" rx="18" ry="14" fill={T} opacity="0.55" />
      <ellipse cx="96" cy="72" rx="16" ry="12" fill={T} opacity="0.5" />
      {/* Roots hint */}
      <path d="M 60 156 Q 52 148 36 154" stroke="#22735A" strokeWidth="3" fill="none" />
      <path d="M 68 156 Q 78 148 94 154" stroke="#22735A" strokeWidth="3" fill="none" />

      {/* Character — small, at base of tree */}
      <Head cx={34} cy={112} r={14} />
      {/* Peaceful eyes override */}
      <circle cx="29" cy="111" r="2.5" fill={D} />
      <circle cx="39" cy="111" r="2.5" fill={D} />
      <path d="M 27 118 Q 34 122 41 118" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Small body */}
      <path d="M 22 126 L 20 156 L 48 156 L 46 126 Z" fill="#1A5C45" />
      {/* Watering can */}
      <rect x="4" y="128" width="16" height="14" rx="4" fill="#22A380" opacity="0.8" />
      <path d="M 20 134 Q 28 130 28 136" stroke="#22A380" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="4" y="124" width="10" height="6" rx="2" fill="#1A7A5E" />
      {/* Water drops */}
      <circle cx="30" cy="139" r="2" fill={T} opacity="0.6" />
      <circle cx="33" cy="143" r="1.5" fill={T} opacity="0.5" />
      <circle cx="27" cy="143" r="1.5" fill={T} opacity="0.4" />
    </Wrap>
  )
}

// ── PSRB: The Blueprint Maker ─────────────────────────────────────────────────
function BlueprintMaker({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Blueprint grid — fills the frame */}
      {[0, 20, 40, 60, 80, 100, 120].map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="160" stroke={T} strokeWidth="0.6" opacity="0.08" />
      ))}
      {[0, 20, 40, 60, 80, 100, 120, 140, 160].map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2="120" y2={y} stroke={T} strokeWidth="0.6" opacity="0.08" />
      ))}
      {/* Blueprint drawing in upper right */}
      <rect x="62" y="10" width="48" height="38" rx="2" fill="none" stroke={T} strokeWidth="1.5" opacity="0.4" />
      <line x1="72" y1="10" x2="72" y2="48" stroke={T} strokeWidth="1" opacity="0.3" />
      <line x1="62" y1="28" x2="110" y2="28" stroke={T} strokeWidth="1" opacity="0.3" />
      <circle cx="86" cy="20" r="6" fill="none" stroke={T} strokeWidth="1.2" opacity="0.4" />
      <line x1="68" y1="34" x2="110" y2="34" stroke={T} strokeWidth="0.8" opacity="0.25" />
      <line x1="68" y1="40" x2="100" y2="40" stroke={T} strokeWidth="0.8" opacity="0.25" />

      {/* Character */}
      {/* Hard hat */}
      <ellipse cx="60" cy="22" rx="30" ry="8" fill={G} opacity="0.9" />
      <rect x="36" y="15" width="48" height="17" rx="11" fill={G} opacity="0.95" />
      <rect x="30" y="28" width="60" height="4" rx="2" fill="#D97706" opacity="0.75" />
      {/* Pencil behind ear */}
      <line x1="82" y1="32" x2="88" y2="42" stroke={G} strokeWidth="4" strokeLinecap="round" />
      <polygon points="82,32 80,26 86,28" fill="#D97706" />
      <Head cy={46} hairColor="transparent" />
      {/* Determined eyes override */}
      <circle cx="54" cy="45" r="3.5" fill={D} />
      <circle cx="66" cy="45" r="3.5" fill={D} />
      <line x1="53" y1="55" x2="67" y2="55" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Work jacket */}
      <path d="M 38 66 L 34 158 L 86 158 L 82 66 Z" fill="#1A5C45" />
      <rect x="46" y="66" width="28" height="14" rx="3" fill={T} opacity="0.35" />
    </Wrap>
  )
}

// ── PSGF: The Open-Road Planner ───────────────────────────────────────────────
function OpenRoadPlanner({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Road vanishing to horizon — hero */}
      <path d="M 0 160 L 44 80 L 76 80 L 120 160 Z" fill={MG} opacity="0.7" />
      <path d="M 52 160 L 56 80 L 64 80 L 68 160 Z" fill={D} opacity="0.5" />
      {/* Dashed center line */}
      {[90, 104, 118, 132, 146].map((y) => (
        <rect key={y} x="58" y={y} width="4" height="8" rx="2" fill={W} opacity="0.25" />
      ))}
      {/* Horizon glow */}
      <rect x="0" y="76" width="120" height="6" rx="3" fill={T} opacity="0.1" />

      {/* Character stands on road */}
      <Head cy={40} />
      {/* Curious eyes override */}
      <circle cx="54" cy="39" r="4" fill={D} />
      <circle cx="66" cy="39" r="4" fill={D} />
      <circle cx="52.5" cy="37.5" r="1.5" fill={W} opacity="0.5" />
      <circle cx="64.5" cy="37.5" r="1.5" fill={W} opacity="0.5" />
      <path d="M 52 50 Q 60 56 68 50" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <path d="M 40 60 L 36 84 L 84 84 L 80 60 Z" fill="#1A5C45" />
      {/* Map in left hand */}
      <rect x="4" y="66" width="32" height="26" rx="2" fill={G} opacity="0.88" />
      <path d="M 10 78 Q 20 70 28 76 Q 36 82 38 90" stroke="#92400E" strokeWidth="1.5" fill="none" />
      <circle cx="26" cy="74" r="4" fill="#EF4444" />
      <circle cx="26" cy="74" r="2" fill={W} />
      <rect x="2" y="62" width="32" height="10" rx="6" fill={T} opacity="0.85" />
      {/* Compass in right hand */}
      <rect x="84" y="62" width="32" height="10" rx="6" fill={T} opacity="0.85" />
      <circle cx="100" cy="80" r="16" fill="rgba(6,78,59,0.9)" stroke={T} strokeWidth="2" />
      <circle cx="100" cy="80" r="10" fill={BG} />
      <line x1="100" y1="68" x2="100" y2="80" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="80" x2="100" y2="90" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="80" x2="100" y2="80" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="100" y1="80" x2="110" y2="80" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="80" r="3" fill={W} />
    </Wrap>
  )
}

// ── ASRB: The MacGyver ────────────────────────────────────────────────────────
function MacGyver({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Giant wrench — hero diagonal */}
      <line x1="24" y1="148" x2="100" y2="20" stroke={W} strokeWidth="10" strokeLinecap="round" opacity="0.85" />
      <circle cx="100" cy="20" r="22" fill="none" stroke={W} strokeWidth="9" opacity="0.85" />
      <circle cx="100" cy="20" r="11" fill={BG} />
      <circle cx="24" cy="148" r="14" fill="none" stroke={W} strokeWidth="7" opacity="0.85" />
      <circle cx="24" cy="148" r="7" fill={BG} />

      {/* Character */}
      <Head cy={70} />
      {/* Confident half-smirk override */}
      <circle cx="54" cy="69" r="3.5" fill={D} />
      <circle cx="66" cy="69" r="3.5" fill={D} />
      <path d="M 54 80 Q 63 85 70 80" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Utility shirt */}
      <path d="M 40 90 L 36 158 L 84 158 L 80 90 Z" fill="#1A5C45" />
      {/* Utility belt */}
      <rect x="36" y="136" width="48" height="8" rx="3" fill="#D97706" opacity="0.7" />
      <rect x="54" y="134" width="12" height="12" rx="2" fill="#D97706" />
      {/* Duct tape roll on hip */}
      <circle cx="24" cy="122" r="12" fill="#6B7280" opacity="0.7" />
      <circle cx="24" cy="122" r="7" fill={BG} opacity="0.85" />
    </Wrap>
  )
}

// ── AEGF: The Wanderer ────────────────────────────────────────────────────────
function Wanderer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Star field */}
      {[[16, 12], [42, 6], [78, 10], [106, 18], [112, 6], [28, 24], [90, 28]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 3 : 1.8} fill={i === 4 ? G : W} opacity={i === 4 ? 0.5 : 0.35} />
      ))}
      {/* Horizon */}
      <path d="M 0 122 Q 30 114 60 118 Q 90 114 120 122" stroke={T} strokeWidth="1.5" fill="none" opacity="0.2" />
      {/* Aurora hints */}
      <path d="M 0 60 Q 40 50 80 58 Q 110 64 120 56" stroke={T} strokeWidth="0.8" fill="none" opacity="0.1" />

      {/* Wind-blown hair */}
      <path d="M 36 42 Q 40 16 58 14 Q 74 10 94 18 Q 102 24 94 36" fill="#1A7A5E" />
      <path d="M 60 16 Q 84 8 102 18 Q 110 24 102 36" fill={T} opacity="0.4" />
      <Head cy={46} hairColor="transparent" />
      {/* Far-off gaze override */}
      <ellipse cx="54" cy="45" rx="5" ry="3.5" fill={D} />
      <ellipse cx="66" cy="45" rx="5" ry="3.5" fill={D} />
      <circle cx="53" cy="43.5" r="1.8" fill={W} opacity="0.45" />
      <circle cx="65" cy="43.5" r="1.8" fill={W} opacity="0.45" />
      <path d="M 53 56 Q 60 61 67 56" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Jacket */}
      <path d="M 38 66 L 34 158 L 86 158 L 82 66 Z" fill="#0F3D30" />
      <line x1="50" y1="66" x2="48" y2="158" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <line x1="70" y1="66" x2="72" y2="158" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      {/* Compass — bold */}
      <circle cx="92" cy="106" r="20" fill="rgba(6,78,59,0.9)" stroke={T} strokeWidth="2.5" />
      <circle cx="92" cy="106" r="13" fill={BG} />
      <line x1="92" y1="90" x2="92" y2="106" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
      <line x1="92" y1="106" x2="92" y2="120" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="78" y1="106" x2="92" y2="106" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="106" x2="106" y2="106" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="92" cy="106" r="3.5" fill={W} />
      {/* Arm holding compass */}
      <rect x="82" y="72" width="12" height="36" rx="6" fill={T} opacity="0.85" />
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
