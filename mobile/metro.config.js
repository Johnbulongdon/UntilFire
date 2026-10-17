// Lets the app import the web app's calculation code from ../lib, so the
// phone and untilfire.com give the same freedom date from the same maths.
const path = require('path')
// Sentry's version of Expo's config also uploads source maps, so crash reports show real file names.
const { getSentryExpoConfig } = require('@sentry/react-native/metro')
const { withNativeWind } = require('nativewind/metro')

const config = getSentryExpoConfig(__dirname)
// Also the FIRE type quiz's data (app/fire-type/quiz-data.ts), which is pure.
config.watchFolders = [path.resolve(__dirname, '../lib'), path.resolve(__dirname, '../app/fire-type')]

module.exports = withNativeWind(config, { input: './src/global.css' })
