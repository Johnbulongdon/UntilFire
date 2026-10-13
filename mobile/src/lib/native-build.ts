import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

/**
 * True inside Expo Go. Features that need the app's own native build (Sign in
 * with Apple under our bundle ID, Plaid's native Link) stay hidden here and
 * switch on by themselves in the development and App Store builds.
 */
export const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

/** Our own iOS build, where native-only features can run. */
export const nativeBuild = Platform.OS === 'ios' && !inExpoGo
