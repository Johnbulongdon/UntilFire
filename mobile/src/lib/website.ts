import * as WebBrowser from 'expo-web-browser'

import { colors } from '@/theme/colors'

/**
 * Opens a page of untilfire.com in an in-app browser, for the pages the app
 * doesn't have yet. The website keeps its own sign-in, so the first visit may ask for it.
 */
export function openWebsite(path: string) {
  WebBrowser.openBrowserAsync(`https://www.untilfire.com${path}`, {
    controlsColor: colors.green,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  }).catch(() => {})
}
