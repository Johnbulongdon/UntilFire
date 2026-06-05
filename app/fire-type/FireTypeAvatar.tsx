'use client'
import React from 'react'

const T = '#22D3A5'
const D = '#064E3B'
const W = '#FFFFFF'
const G = '#FCD34D'
const BG = '#0B3B2A'

function Wrap({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="120" height="120" fill={BG} />
      {children}
    </svg>
  )
}

// ── PERB: The Spreadsheet Nerd ────────────────────────────────────────────────
// Big round glasses, tie, tiny laptop with a chart
function SpreadsheetNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Hair */}
      <path d="M 34 38 Q 40 22 60 22 Q 80 22 86 38" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Big round glasses */}
      <circle cx="49" cy="49" r="11" fill="rgba(6,78,59,0.8)" stroke={W} strokeWidth="2.5" />
      <circle cx="71" cy="49" r="11" fill="rgba(6,78,59,0.8)" stroke={W} strokeWidth="2.5" />
      <line x1="60" y1="49" x2="60" y2="49" stroke={W} strokeWidth="2.5" />
      <line x1="38" y1="49" x2="32" y2="53" stroke={W} strokeWidth="2" />
      <line x1="82" y1="49" x2="88" y2="53" stroke={W} strokeWidth="2" />
      {/* Pupils */}
      <circle cx="49" cy="49" r="5" fill={T} opacity="0.9" />
      <circle cx="71" cy="49" r="5" fill={T} opacity="0.9" />
      <circle cx="47" cy="47" r="2" fill={W} opacity="0.5" />
      <circle cx="69" cy="47" r="2" fill={W} opacity="0.5" />
      {/* Slight smirk */}
      <path d="M 51 62 Q 60 67 69 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body / suit */}
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#112B20" />
      <path d="M 52 75 L 57 88 L 46 75" fill="#1A4035" />
      <path d="M 68 75 L 63 88 L 74 75" fill="#1A4035" />
      {/* Tie */}
      <polygon points="59,75 63,75 61.5,93 60.5,93" fill={G} />
      {/* Laptop */}
      <rect x="66" y="93" width="34" height="22" rx="3" fill={W} opacity="0.95" />
      <rect x="68" y="95" width="30" height="16" rx="2" fill={D} />
      <rect x="70" y="105" width="4" height="5" fill={T} />
      <rect x="76" y="103" width="4" height="7" fill={T} />
      <rect x="82" y="101" width="4" height="9" fill={G} />
      <rect x="88" y="99" width="4" height="11" fill={T} />
      <rect x="64" y="115" width="38" height="2" rx="1" fill="rgba(255,255,255,0.3)" />
    </Wrap>
  )
}

// ── PEGF: The Digital Nomad ───────────────────────────────────────────────────
// Wraparound shades, backpack straps, boarding pass, tiny plane
function DigitalNomad({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Tiny plane top-right */}
      <path d="M 85 10 L 110 18 L 104 22 L 112 26 L 88 24 L 85 30 L 80 22 Z" fill={T} opacity="0.25" />
      {/* Hair - casual tousled */}
      <path d="M 34 40 Q 38 22 60 22 Q 82 22 86 40" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Wraparound sunglasses */}
      <rect x="36" y="43" width="22" height="13" rx="5" fill={D} stroke={W} strokeWidth="2" />
      <rect x="62" y="43" width="22" height="13" rx="5" fill={D} stroke={W} strokeWidth="2" />
      <line x1="58" y1="50" x2="62" y2="50" stroke={W} strokeWidth="2" />
      <line x1="36" y1="50" x2="28" y2="53" stroke={W} strokeWidth="1.5" />
      <line x1="84" y1="50" x2="92" y2="53" stroke={W} strokeWidth="1.5" />
      {/* Glare on lenses */}
      <rect x="40" y="46" width="7" height="3" rx="2" fill={W} opacity="0.25" />
      <rect x="66" y="46" width="7" height="3" rx="2" fill={W} opacity="0.25" />
      {/* Relaxed smile */}
      <path d="M 50 62 Q 60 68 70 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body + backpack straps */}
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      <line x1="50" y1="75" x2="48" y2="108" stroke={T} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="70" y1="75" x2="72" y2="108" stroke={T} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <rect x="52" y="88" width="16" height="10" rx="3" fill={T} opacity="0.3" />
      {/* Boarding pass in hand */}
      <rect x="4" y="82" width="24" height="14" rx="2" fill={G} opacity="0.9" />
      <rect x="6" y="84" width="20" height="2" rx="1" fill={D} opacity="0.5" />
      <rect x="6" y="88" width="14" height="2" rx="1" fill={D} opacity="0.3" />
      <rect x="6" y="92" width="18" height="2" rx="1" fill={D} opacity="0.3" />
      <line x1="22" y1="82" x2="22" y2="96" stroke={D} strokeWidth="1" opacity="0.3" />
    </Wrap>
  )
}

// ── ASGF: The Beach Bum Millionaire ──────────────────────────────────────────
// Huge sun hat, shades, cocktail, wave
function BeachBum({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Ocean wave */}
      <path d="M 0 92 Q 20 84 40 92 Q 60 100 80 92 Q 100 84 120 92 L 120 120 L 0 120 Z" fill={T} opacity="0.12" />
      {/* Wide brim hat */}
      <ellipse cx="60" cy="29" rx="44" ry="9" fill={G} />
      <rect x="34" y="18" width="52" height="20" rx="14" fill={G} opacity="0.95" />
      <rect x="30" y="33" width="60" height="5" rx="2" fill="#D97706" opacity="0.7" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Round sunglasses */}
      <circle cx="49" cy="51" r="10" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2" />
      <circle cx="71" cy="51" r="10" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2" />
      <line x1="59" y1="51" x2="61" y2="51" stroke={W} strokeWidth="2" />
      <line x1="39" y1="51" x2="32" y2="54" stroke={W} strokeWidth="1.5" />
      <line x1="81" y1="51" x2="88" y2="54" stroke={W} strokeWidth="1.5" />
      <circle cx="45" cy="48" r="2.5" fill={W} opacity="0.25" />
      <circle cx="67" cy="48" r="2.5" fill={W} opacity="0.25" />
      {/* Big relaxed grin */}
      <path d="M 47 64 Q 60 73 73 64" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Floral shirt */}
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      <circle cx="52" cy="87" r="3" fill={T} opacity="0.45" />
      <circle cx="68" cy="84" r="3" fill={T} opacity="0.45" />
      <circle cx="58" cy="96" r="3" fill={G} opacity="0.35" />
      {/* Cocktail glass */}
      <polygon points="96,70 84,70 88,90 92,90" fill={W} opacity="0.85" />
      <rect x="88" y="90" width="4" height="5" fill={W} opacity="0.85" />
      <rect x="84" y="95" width="12" height="2" rx="1" fill={W} opacity="0.85" />
      <line x1="94" y1="68" x2="100" y2="57" stroke={T} strokeWidth="2" strokeLinecap="round" />
      <path d="M 84 70 Q 90 64 96 70" fill={T} opacity="0.5" />
    </Wrap>
  )
}

// ── PSRF: The Minimalist Monk ─────────────────────────────────────────────────
// Lotus pose, closed eyes, calm aura rings
function MinimalistMonk({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Aura rings */}
      <circle cx="60" cy="60" r="54" fill="none" stroke={T} strokeWidth="0.6" opacity="0.15" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={T} strokeWidth="0.6" opacity="0.12" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={T} strokeWidth="0.6" opacity="0.1" />
      {/* Seated body */}
      <path d="M 20 108 Q 30 78 60 74 Q 90 78 100 108 Z" fill="#1A5C45" />
      {/* Crossed legs */}
      <path d="M 24 108 Q 38 92 60 94 Q 82 92 96 108" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Closed eyes — peaceful arcs */}
      <path d="M 46 48 Q 50 44 54 48" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 66 48 Q 70 44 74 48" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Serene smile */}
      <path d="M 52 61 Q 60 66 68 61" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Hands in mudra */}
      <ellipse cx="44" cy="92" rx="9" ry="5" fill={T} opacity="0.8" />
      <ellipse cx="76" cy="92" rx="9" ry="5" fill={T} opacity="0.8" />
      {/* Crown glow */}
      <circle cx="60" cy="20" r="5" fill={G} opacity="0.55" />
      <circle cx="60" cy="20" r="10" fill={G} opacity="0.18" />
    </Wrap>
  )
}

// ── PSGB: The Chess Player ────────────────────────────────────────────────────
// Hand on chin, chess piece, intense thinking face
function ChessPlayer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Chess board strip at bottom */}
      {[0, 15, 30, 45, 60, 75, 90, 105].map((x, i) => (
        <rect key={x} x={x} y={108} width="15" height="12" fill={i % 2 === 0 ? 'rgba(34,211,165,0.14)' : 'transparent'} />
      ))}
      {/* Hair */}
      <path d="M 34 38 Q 40 22 60 22 Q 80 22 86 38" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Eyes - focused, slightly narrowed */}
      <ellipse cx="50" cy="48" rx="5" ry="3.5" fill={D} />
      <ellipse cx="70" cy="48" rx="5" ry="3.5" fill={D} />
      <circle cx="48.5" cy="47" r="1.5" fill={W} opacity="0.5" />
      <circle cx="68.5" cy="47" r="1.5" fill={W} opacity="0.5" />
      {/* Thoughtful straight mouth */}
      <line x1="52" y1="63" x2="68" y2="63" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      {/* Body */}
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Hand on chin (elbow propped) */}
      <rect x="28" y="82" width="20" height="10" rx="5" fill={T} opacity="0.9" />
      <rect x="32" y="70" width="10" height="16" rx="5" fill={T} opacity="0.9" />
      {/* Chess piece — king */}
      <rect x="78" y="74" width="14" height="22" rx="2" fill={W} opacity="0.9" />
      <rect x="74" y="93" width="22" height="4" rx="2" fill={W} opacity="0.9" />
      <rect x="82" y="66" width="5" height="10" rx="2" fill={W} opacity="0.9" />
      <rect x="78" y="70" width="13" height="4" rx="1" fill={W} opacity="0.9" />
    </Wrap>
  )
}

// ── AERB: The Mad Scientist ───────────────────────────────────────────────────
// Wild spiky hair, big round goggles, bubbling flask
function MadScientist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Wild hair — spiky before head */}
      <path d="M 32 44 L 27 20 L 38 34 L 35 14 L 46 30 L 48 12 L 58 28 L 60 10 L 65 28 L 72 12 L 74 30 L 82 16 L 84 38 L 90 22 L 88 44"
        fill={T} opacity="0.85" strokeLinejoin="round" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Big round goggles */}
      <circle cx="49" cy="48" r="13" fill="rgba(6,78,59,0.65)" stroke={W} strokeWidth="3" />
      <circle cx="71" cy="48" r="13" fill="rgba(6,78,59,0.65)" stroke={W} strokeWidth="3" />
      <rect x="62" y="44" width="9" height="8" rx="0" fill="none" stroke={W} strokeWidth="2.5" />
      <circle cx="49" cy="48" r="7" fill={T} opacity="0.35" />
      <circle cx="71" cy="48" r="7" fill={T} opacity="0.35" />
      <circle cx="45" cy="44" r="3" fill={W} opacity="0.4" />
      <circle cx="67" cy="44" r="3" fill={W} opacity="0.4" />
      {/* Excited wide grin */}
      <path d="M 46 64 Q 60 74 74 64" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="50" y="64" width="5" height="4" rx="1" fill={W} />
      <rect x="57" y="65" width="5" height="4" rx="1" fill={W} />
      <rect x="64" y="64" width="5" height="4" rx="1" fill={W} />
      {/* Lab coat */}
      <rect x="36" y="74" width="48" height="34" rx="9" fill={W} opacity="0.92" />
      <path d="M 52 74 L 58 88 L 46 74" fill="#DDE8E4" />
      <path d="M 68 74 L 62 88 L 74 74" fill="#DDE8E4" />
      {/* Bubbling flask */}
      <path d="M 80 64 L 76 76 Q 73 88 82 91 Q 91 88 88 76 L 84 64 Z" fill={T} opacity="0.8" stroke={W} strokeWidth="1.5" />
      <rect x="78" y="59" width="9" height="6" rx="3" fill={W} opacity="0.9" />
      <circle cx="86" cy="55" r="2.5" fill={T} opacity="0.5" />
      <circle cx="90" cy="48" r="3.5" fill={T} opacity="0.35" />
      <circle cx="84" cy="42" r="2" fill={T} opacity="0.25" />
    </Wrap>
  )
}

// ── AEGB: The Serial Hustler ──────────────────────────────────────────────────
// Three phones everywhere, lightning bolts, wide-awake face
function SerialHustler({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Lightning bolts */}
      <path d="M 12 22 L 8 36 L 16 36 L 10 52" stroke={G} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 108 28 L 104 42 L 112 42 L 106 58" stroke={G} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Hair */}
      <path d="M 34 38 Q 38 20 60 20 Q 82 20 86 38" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Wide-awake big eyes */}
      <circle cx="50" cy="48" r="6" fill={D} />
      <circle cx="70" cy="48" r="6" fill={D} />
      <circle cx="47.5" cy="46" r="2.5" fill={W} opacity="0.6" />
      <circle cx="67.5" cy="46" r="2.5" fill={W} opacity="0.6" />
      {/* Determined tight grin */}
      <path d="M 49 62 Q 60 68 71 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Left phone */}
      <rect x="4" y="72" width="18" height="30" rx="3" fill={W} opacity="0.9" />
      <rect x="6" y="74" width="14" height="24" rx="2" fill={D} />
      <rect x="8" y="78" width="10" height="2" rx="1" fill={T} />
      <rect x="8" y="82" width="7" height="2" rx="1" fill={G} opacity="0.7" />
      <rect x="8" y="86" width="9" height="2" rx="1" fill={T} opacity="0.6" />
      {/* Right phone */}
      <rect x="98" y="70" width="18" height="30" rx="3" fill={W} opacity="0.9" />
      <rect x="100" y="72" width="14" height="24" rx="2" fill={D} />
      <rect x="102" y="76" width="10" height="2" rx="1" fill={G} />
      <rect x="102" y="80" width="7" height="2" rx="1" fill={T} opacity="0.6" />
      <rect x="102" y="84" width="9" height="2" rx="1" fill={T} opacity="0.5" />
      {/* Top phone (tilted) */}
      <g transform="rotate(-12, 60, 14)">
        <rect x="40" y="4" width="30" height="18" rx="3" fill={W} opacity="0.85" />
        <rect x="42" y="6" width="26" height="14" rx="2" fill={D} />
        <line x1="44" y1="10" x2="66" y2="10" stroke={G} strokeWidth="2" />
        <line x1="44" y1="14" x2="60" y2="14" stroke={T} strokeWidth="1.5" opacity="0.6" />
      </g>
    </Wrap>
  )
}

// ── AERF: The Free Spirit ─────────────────────────────────────────────────────
// Wild flowing hair in all directions, butterfly, open smile
function FreeSpirit({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Butterfly */}
      <path d="M 88 28 Q 102 16 108 32 Q 102 42 88 34 Z" fill={T} opacity="0.65" />
      <path d="M 88 34 Q 102 42 104 54 Q 95 50 88 42 Z" fill={T} opacity="0.45" />
      <path d="M 88 28 Q 74 16 68 32 Q 74 42 88 34 Z" fill={G} opacity="0.5" />
      <path d="M 88 34 Q 74 42 72 54 Q 81 50 88 42 Z" fill={G} opacity="0.35" />
      <circle cx="88" cy="31" r="3" fill={D} opacity="0.7" />
      <path d="M 86 29 Q 78 20 70 18" stroke={D} strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M 90 29 Q 98 20 106 18" stroke={D} strokeWidth="1.2" fill="none" opacity="0.5" />
      {/* Wild hair flowing out */}
      <path d="M 33 46 Q 22 18 38 12 Q 50 8 58 24" fill={T} opacity="0.8" />
      <path d="M 87 46 Q 98 18 82 12 Q 70 8 62 24" fill={T} opacity="0.8" />
      <path d="M 40 28 Q 34 12 50 8 Q 62 6 64 22" fill="#1A7A5E" />
      <path d="M 80 28 Q 86 12 70 8 Q 58 6 56 22" fill="#1A7A5E" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Bright eyes */}
      <circle cx="50" cy="48" r="5" fill={D} />
      <circle cx="70" cy="48" r="5" fill={D} />
      <circle cx="48" cy="46" r="2" fill={W} opacity="0.6" />
      <circle cx="68" cy="46" r="2" fill={W} opacity="0.6" />
      {/* Big happy open smile */}
      <path d="M 46 63 Q 60 74 74 63" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="69" rx="10" ry="4.5" fill={D} opacity="0.25" />
      {/* Flowy outfit */}
      <path d="M 36 75 Q 26 92 30 108 L 60 100 L 90 108 Q 94 92 84 75 Z" fill="#1A5C45" />
    </Wrap>
  )
}

// ── ASRF: The Cool Minimalist ─────────────────────────────────────────────────
// Slim rectangle shades, slicked-back hair, confident half-smile
function CoolMinimalist({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Slicked-back hair */}
      <path d="M 34 40 Q 40 24 63 24 Q 82 24 86 40" fill="#1A7A5E" />
      <path d="M 34 40 Q 40 26 66 25" stroke={D} strokeWidth="2" fill="none" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Slim rectangular shades */}
      <rect x="36" y="44" width="20" height="11" rx="3" fill={D} stroke={W} strokeWidth="2" />
      <rect x="64" y="44" width="20" height="11" rx="3" fill={D} stroke={W} strokeWidth="2" />
      <line x1="56" y1="49" x2="64" y2="49" stroke={W} strokeWidth="2" />
      <line x1="36" y1="49" x2="28" y2="53" stroke={W} strokeWidth="1.5" />
      <line x1="84" y1="49" x2="92" y2="53" stroke={W} strokeWidth="1.5" />
      <rect x="40" y="47" width="6" height="3" rx="1" fill={W} opacity="0.2" />
      <rect x="68" y="47" width="6" height="3" rx="1" fill={W} opacity="0.2" />
      {/* Confident one-sided smirk */}
      <path d="M 54 63 Q 63 67 70 63" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Clean minimal outfit */}
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      <path d="M 52 75 L 60 86 L 68 75" stroke="#22A380" strokeWidth="2" fill="none" />
    </Wrap>
  )
}

// ── PERF: The Income Maximizer ────────────────────────────────────────────────
// Sharp suit, big upward arrow, confident pose
function IncomeMaximizer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Rising chart in background */}
      <path d="M 5 112 L 25 98 L 45 104 L 65 84 L 85 78 L 105 56 L 115 44"
        stroke={T} strokeWidth="2" fill="none" opacity="0.18" strokeLinecap="round" />
      {/* Hair - sharp and professional */}
      <path d="M 34 38 Q 42 22 60 22 Q 78 22 86 38" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Confident eyes */}
      <circle cx="50" cy="48" r="4.5" fill={D} />
      <circle cx="70" cy="48" r="4.5" fill={D} />
      <circle cx="48" cy="46" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="46" r="2" fill={W} opacity="0.5" />
      {/* Confident smile */}
      <path d="M 50 62 Q 60 68 70 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Sharp suit */}
      <rect x="36" y="74" width="48" height="34" rx="9" fill="#0F2E22" />
      <path d="M 52 74 L 57 88 L 46 74" fill="#1A4035" />
      <path d="M 68 74 L 63 88 L 74 74" fill="#1A4035" />
      <polygon points="59,74 63,74 61.5,93 60.5,93" fill={T} />
      {/* Big upward arrow */}
      <path d="M 90 104 L 90 68" stroke={G} strokeWidth="4" strokeLinecap="round" />
      <path d="M 90 68 L 83 78" stroke={G} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 90 68 L 97 78" stroke={G} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dollar sign */}
      <text x="6" y="38" fontSize="22" fill={G} opacity="0.3" fontWeight="bold">$</text>
    </Wrap>
  )
}

// ── PEGB: The Efficiency Nerd ─────────────────────────────────────────────────
// Gear background, clipboard with checklist, focused face
function EfficiencyNerd({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Gear outline */}
      <circle cx="96" cy="22" r="16" fill="none" stroke={T} strokeWidth="2" opacity="0.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180
        const x = 96 + 18 * Math.cos(rad)
        const y = 22 + 18 * Math.sin(rad)
        return <rect key={angle} x={x - 3} y={y - 5} width="6" height="10" rx="1" fill={T} opacity="0.2"
          transform={`rotate(${angle} ${x} ${y})`} />
      })}
      {/* Hair */}
      <path d="M 34 38 Q 40 24 60 22 Q 80 24 86 38" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Focused eyes */}
      <circle cx="50" cy="48" r="4.5" fill={D} />
      <circle cx="70" cy="48" r="4.5" fill={D} />
      <circle cx="48" cy="46" r="1.8" fill={W} opacity="0.5" />
      <circle cx="68" cy="46" r="1.8" fill={W} opacity="0.5" />
      {/* Straight mouth — focused not smiling */}
      <line x1="52" y1="63" x2="68" y2="63" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Clipboard */}
      <rect x="72" y="70" width="30" height="38" rx="3" fill={W} opacity="0.9" />
      <rect x="76" y="66" width="22" height="7" rx="3" fill="#CBD5E1" />
      <rect x="82" y="64" width="10" height="7" rx="3" fill="#94A3B8" />
      {/* Checklist items */}
      <rect x="76" y="80" width="5" height="5" rx="1" fill="#22A380" />
      <path d="M 77 82.5 L 79.5 85 L 83 80" stroke={W} strokeWidth="1.5" fill="none" />
      <line x1="84" y1="82" x2="98" y2="82" stroke="#94A3B8" strokeWidth="1.5" />
      <rect x="76" y="89" width="5" height="5" rx="1" fill="#22A380" />
      <path d="M 77 91.5 L 79.5 94 L 83 89" stroke={W} strokeWidth="1.5" fill="none" />
      <line x1="84" y1="91" x2="98" y2="91" stroke="#94A3B8" strokeWidth="1.5" />
      <rect x="76" y="98" width="5" height="5" rx="1" fill="rgba(148,163,184,0.3)" stroke="#94A3B8" strokeWidth="1" />
      <line x1="84" y1="100" x2="98" y2="100" stroke="#94A3B8" strokeWidth="1.5" />
    </Wrap>
  )
}

// ── ASGB: The Patient Investor ────────────────────────────────────────────────
// Growing plant beside them, watering can, calm patient smile
function PatientInvestor({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Tall growing plant */}
      <path d="M 96 112 Q 95 84 90 68 Q 86 56 92 44" stroke="#22A380" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 91 68 Q 104 60 106 44 Q 94 54 91 68" fill={T} opacity="0.7" />
      <path d="M 92 80 Q 78 72 77 56 Q 90 66 92 80" fill={T} opacity="0.6" />
      <path d="M 90 55 Q 100 44 102 30 Q 92 40 90 55" fill="#22A380" opacity="0.5" />
      {/* Hair */}
      <path d="M 34 40 Q 40 24 60 24 Q 80 24 86 40" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Calm patient eyes */}
      <circle cx="50" cy="48" r="4.5" fill={D} />
      <circle cx="70" cy="48" r="4.5" fill={D} />
      <circle cx="48" cy="46" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="46" r="2" fill={W} opacity="0.5" />
      {/* Peaceful gentle smile */}
      <path d="M 50 62 Q 60 68 70 62" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Watering can */}
      <rect x="4" y="80" width="24" height="18" rx="5" fill="#22A380" opacity="0.8" />
      <path d="M 28 87 Q 38 82 38 90" stroke="#22A380" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="4" y="75" width="16" height="7" rx="3" fill="#1A7A5E" />
      {/* Water drops */}
      <circle cx="40" cy="94" r="2.5" fill={T} opacity="0.6" />
      <circle cx="44" cy="99" r="2" fill={T} opacity="0.5" />
      <circle cx="37" cy="99" r="2" fill={T} opacity="0.4" />
      <circle cx="42" cy="104" r="1.5" fill={T} opacity="0.3" />
    </Wrap>
  )
}

// ── PSRB: The Blueprint Maker ─────────────────────────────────────────────────
// Hard hat, rolled blueprint, pencil behind ear
function BlueprintMaker({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Hard hat */}
      <ellipse cx="60" cy="28" rx="34" ry="10" fill={G} />
      <rect x="34" y="20" width="52" height="20" rx="14" fill={G} opacity="0.95" />
      <rect x="28" y="33" width="64" height="5" rx="2" fill="#D97706" opacity="0.75" />
      {/* Pencil tucked behind ear */}
      <line x1="84" y1="38" x2="90" y2="50" stroke={G} strokeWidth="3.5" strokeLinecap="round" />
      <polygon points="84,38 82,32 88,34" fill="#D97706" />
      {/* Eyes - precise */}
      <circle cx="50" cy="50" r="4.5" fill={D} />
      <circle cx="70" cy="50" r="4.5" fill={D} />
      <circle cx="48" cy="48" r="1.8" fill={W} opacity="0.5" />
      <circle cx="68" cy="48" r="1.8" fill={W} opacity="0.5" />
      {/* Serious determined mouth */}
      <line x1="52" y1="63" x2="68" y2="63" stroke={D} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Blueprint scroll */}
      <rect x="70" y="70" width="34" height="24" rx="3" fill="#BFDBFE" opacity="0.85" />
      <rect x="68" y="70" width="5" height="24" rx="2" fill="#93C5FD" />
      <rect x="99" y="70" width="5" height="24" rx="2" fill="#93C5FD" />
      <line x1="75" y1="76" x2="99" y2="76" stroke="#1D4ED8" strokeWidth="1" opacity="0.5" />
      <line x1="75" y1="80" x2="99" y2="80" stroke="#1D4ED8" strokeWidth="1" opacity="0.5" />
      <line x1="75" y1="84" x2="90" y2="84" stroke="#1D4ED8" strokeWidth="1" opacity="0.5" />
      <rect x="76" y="77" width="10" height="6" fill="none" stroke="#1D4ED8" strokeWidth="1" opacity="0.5" />
    </Wrap>
  )
}

// ── PSGF: The Open-Road Planner ───────────────────────────────────────────────
// Unfolded map in one hand, compass in the other
function OpenRoadPlanner({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Hair */}
      <path d="M 34 40 Q 38 22 60 22 Q 82 22 86 40" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Bright curious eyes */}
      <circle cx="50" cy="48" r="4.5" fill={D} />
      <circle cx="70" cy="48" r="4.5" fill={D} />
      <circle cx="48" cy="46" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="46" r="2" fill={W} opacity="0.5" />
      {/* Planning smile */}
      <path d="M 50 62 Q 60 68 70 62" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Map */}
      <rect x="4" y="76" width="36" height="28" rx="2" fill={G} opacity="0.88" />
      <path d="M 10 88 Q 22 80 30 86 Q 38 92 40 100" stroke="#92400E" strokeWidth="1.5" fill="none" />
      <line x1="20" y1="76" x2="20" y2="104" stroke="#D97706" strokeWidth="0.5" opacity="0.5" />
      <line x1="4" y1="90" x2="40" y2="90" stroke="#D97706" strokeWidth="0.5" opacity="0.5" />
      <circle cx="28" cy="84" r="3.5" fill="#EF4444" />
      <circle cx="28" cy="84" r="1.5" fill={W} />
      {/* Compass */}
      <circle cx="94" cy="90" r="16" fill="rgba(6,78,59,0.85)" stroke={W} strokeWidth="2" />
      <circle cx="94" cy="90" r="11" fill="none" stroke={T} strokeWidth="1" opacity="0.5" />
      <line x1="94" y1="76" x2="94" y2="90" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="94" y1="90" x2="94" y2="102" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="80" y1="90" x2="94" y2="90" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="94" y1="90" x2="108" y2="90" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="94" cy="90" r="3" fill={W} />
    </Wrap>
  )
}

// ── ASRB: The MacGyver ────────────────────────────────────────────────────────
// Big wrench raised, duct tape roll, resourceful look
function MacGyver({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Hair */}
      <path d="M 34 38 Q 40 24 60 22 Q 80 24 86 38" fill="#1A7A5E" />
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Resourceful eyes */}
      <circle cx="50" cy="48" r="4.5" fill={D} />
      <circle cx="70" cy="48" r="4.5" fill={D} />
      <circle cx="48" cy="46" r="2" fill={W} opacity="0.5" />
      <circle cx="68" cy="46" r="2" fill={W} opacity="0.5" />
      {/* Confident half-smile */}
      <path d="M 51 62 Q 61 68 70 63" stroke={D} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="38" y="75" width="44" height="33" rx="9" fill="#1A5C45" />
      {/* Big wrench */}
      <line x1="82" y1="66" x2="106" y2="96" stroke={W} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <circle cx="80" cy="60" r="12" fill="none" stroke={W} strokeWidth="5.5" opacity="0.9" />
      <circle cx="80" cy="60" r="5" fill={BG} />
      <path d="M 108 96 Q 113 103 108 108 Q 102 111 98 106 L 103 102" fill={W} opacity="0.85" />
      {/* Duct tape roll */}
      <circle cx="22" cy="92" r="14" fill="#9CA3AF" opacity="0.7" />
      <circle cx="22" cy="92" r="8" fill={BG} opacity="0.85" />
      <circle cx="22" cy="92" r="5" fill="#6B7280" opacity="0.5" />
      <rect x="30" y="86" width="22" height="8" rx="1" fill="#9CA3AF" opacity="0.55"
        transform="rotate(-10 41 90)" />
      {/* Swiss army knife */}
      <rect x="5" y="74" width="9" height="22" rx="2" fill="#EF4444" opacity="0.85" />
      <rect x="5" y="68" width="9" height="9" rx="1" fill="#CBD5E1" opacity="0.9" />
    </Wrap>
  )
}

// ── AEGF: The Wanderer ────────────────────────────────────────────────────────
// Wind-swept hair, compass in hand, stars, looking into distance
function Wanderer({ size }: { size: number }) {
  return (
    <Wrap size={size}>
      {/* Stars */}
      <circle cx="18" cy="18" r="1.8" fill={W} opacity="0.4" />
      <circle cx="44" cy="10" r="1.8" fill={W} opacity="0.4" />
      <circle cx="75" cy="14" r="1.8" fill={W} opacity="0.4" />
      <circle cx="102" cy="22" r="1.8" fill={W} opacity="0.4" />
      <circle cx="112" cy="10" r="2.5" fill={G} opacity="0.5" />
      {/* Horizon line */}
      <path d="M 0 88 Q 30 82 60 84 Q 90 82 120 88" stroke={T} strokeWidth="1" fill="none" opacity="0.18" />
      {/* Wind-blown hair */}
      <path d="M 34 44 Q 36 20 55 18 Q 72 14 90 22 Q 98 28 90 40" fill="#1A7A5E" />
      <path d="M 60 20 Q 82 12 98 20 Q 106 26 98 36" fill={T} opacity="0.5" />
      {/* Head */}
      <circle cx="60" cy="50" r="28" fill={T} />
      {/* Far-off gaze — slight squint */}
      <ellipse cx="50" cy="48" rx="5" ry="3.5" fill={D} />
      <ellipse cx="70" cy="48" rx="5" ry="3.5" fill={D} />
      <circle cx="48" cy="47" r="1.8" fill={W} opacity="0.5" />
      <circle cx="68" cy="47" r="1.8" fill={W} opacity="0.5" />
      {/* Small content smile */}
      <path d="M 52 62 Q 60 67 68 62" stroke={D} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Jacket */}
      <rect x="36" y="75" width="48" height="33" rx="9" fill="#0F3D30" />
      <line x1="48" y1="75" x2="46" y2="108" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="72" y1="75" x2="74" y2="108" stroke={T} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      {/* Compass */}
      <circle cx="92" cy="90" r="15" fill="rgba(6,78,59,0.9)" stroke={T} strokeWidth="2" />
      <circle cx="92" cy="90" r="10" fill={BG} />
      <line x1="92" y1="78" x2="92" y2="90" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="90" x2="92" y2="100" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="82" y1="90" x2="92" y2="90" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="92" y1="90" x2="102" y2="90" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <circle cx="92" cy="90" r="2.5" fill={W} />
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
