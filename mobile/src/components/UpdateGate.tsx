import * as Application from 'expo-application'
import { useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'

import { EmptyState } from '@/components/EmptyState'
import { colors } from '@/theme/colors'

/** "1.2.10" vs "1.10.0", by number, part by part. */
export function olderThan(version: string, min: string) {
  const a = version.split('.').map(Number)
  const b = min.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0)
    if (d !== 0) return d < 0
  }
  return false
}

/**
 * Covers the app with "Update UntilFire" when this build is older than the
 * website supports (app/api/app-version), so the phone never shows money
 * maths the website has moved on from. Offline or unreachable: the app opens as usual.
 */
export function UpdateGate() {
  const [storeUrl, setStoreUrl] = useState<string | null>(null)
  useEffect(() => {
    const version = Application.nativeApplicationVersion
    if (!version || __DEV__) return
    fetch('https://www.untilfire.com/api/app-version')
      .then(res => (res.ok ? res.json() : null))
      .then((body: { minVersion?: string; storeUrl?: string } | null) => {
        if (body?.minVersion && olderThan(version, body.minVersion)) setStoreUrl(body.storeUrl ?? 'https://apps.apple.com')
      })
      .catch(() => {})
  }, [])
  if (!storeUrl) return null
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.ground, justifyContent: 'center', zIndex: 200 }]}>
      <EmptyState
        mood="quiet"
        title="Update UntilFire"
        body="This version is out of date. Update to keep your numbers matching the website."
        action={{ label: 'Update', onPress: () => { Linking.openURL(storeUrl).catch(() => {}) } }}
      />
    </View>
  )
}
