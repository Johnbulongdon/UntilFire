import { router } from 'expo-router'
import { useEffect } from 'react'

/** Backup for +native-intent: if the Google return link ever opens a page, step off it. */
export default function AuthReturn() {
  useEffect(() => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }, [])
  return null
}
