// Lets the app import the web app's calculation code from ../lib, so the
// phone and untilfire.com give the same freedom date from the same maths.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)
// Also the FIRE type quiz's data (app/fire-type/quiz-data.ts), which is pure.
config.watchFolders = [path.resolve(__dirname, '../lib'), path.resolve(__dirname, '../app/fire-type')]

module.exports = withNativeWind(config, { input: './src/global.css' })
