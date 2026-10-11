// Lets the app import the web app's calculation code from ../lib, so the
// phone and untilfire.com give the same freedom date from the same maths.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '../lib')]

module.exports = withNativeWind(config, { input: './src/global.css' })
