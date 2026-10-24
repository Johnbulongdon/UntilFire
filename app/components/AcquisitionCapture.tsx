'use client'

import { useEffect } from 'react'
import { getAcquisitionSource } from '@/lib/acquisition'

/** Capture first-party attribution on every public entry route. */
export default function AcquisitionCapture() {
  useEffect(() => {
    // getAcquisitionSource detects the current visit and persists it. The
    // value is read later by the calculator and signup funnel events.
    getAcquisitionSource()
  }, [])

  return null
}
