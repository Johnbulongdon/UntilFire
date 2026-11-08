import { requireOptionalNativeModule } from 'expo'

/** A Google Wallet alert as the Android listener kept it. */
export interface WalletAlert { id: string; app: string; title: string; text: string; postedAt: number }

interface WalletAlertsNative {
  hasAccess(): boolean
  isActive(): boolean
  setActive(on: boolean): void
  openAccessSettings(): void
  pending(): string
  remove(ids: string[]): void
}

/** Null on iPhone, the web and in Expo Go: only the Android store build has it. */
export const WalletAlerts = requireOptionalNativeModule<WalletAlertsNative>('WalletAlerts')
