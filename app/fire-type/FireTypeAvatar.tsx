'use client'

import React from 'react'
import { FIRE_PERSONALITY_PROFILES, type FirePersonalityCode } from '@/lib/fire-personality'

type FireTypeAvatarProps = {
  code: string
  size?: number
  className?: string
  zoom?: number
}

function isFirePersonalityCode(code: string): code is FirePersonalityCode {
  return code in FIRE_PERSONALITY_PROFILES
}

export function FireTypeAvatar({ code, size = 120, className, zoom = 1 }: FireTypeAvatarProps) {
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
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${profile.artwork.sheet}")`,
          backgroundPosition: `${x} ${y}`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '200% 200%',
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}
