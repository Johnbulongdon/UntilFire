'use client'

import React from 'react'
import { FIRE_PERSONALITY_PROFILES, type FirePersonalityCode } from '@/lib/fire-personality'

type FireTypeAvatarProps = {
  code: string
  size?: number
  className?: string
}

function isFirePersonalityCode(code: string): code is FirePersonalityCode {
  return code in FIRE_PERSONALITY_PROFILES
}

export function FireTypeAvatar({ code, size = 120, className }: FireTypeAvatarProps) {
  if (!isFirePersonalityCode(code)) return null

  const profile = FIRE_PERSONALITY_PROFILES[code]
  const height = Math.round(size * 4 / 3)
  const x = profile.artwork.column === 0 ? '0%' : '100%'
  const y = profile.artwork.row === 0 ? '0%' : '100%'

  return (
    <div
      aria-label={`${profile.code} avatar`}
      className={className}
      role="img"
      style={{
        width: size,
        height,
        borderRadius: Math.max(12, Math.round(size * 0.08)),
        backgroundColor: '#0B3B2A',
        backgroundImage: `url("${profile.artwork.sheet}")`,
        backgroundPosition: `${x} ${y}`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '200% 200%',
        boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    />
  )
}
