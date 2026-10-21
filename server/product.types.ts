import type { StrategySettings } from '../src/domain/types'

export interface User { id: string; countryCode: string; mobile: string; createdAt: number }
export interface Session { token: string; userId: string; expiresAt: number; revoked: boolean }
export interface OtpChallenge { key: string; otpHash: string; expiresAt: number; attempts: number; lastSentAt: number }
export interface UserPreferences {
  appearance: 'light' | 'dark' | 'system'
  signalNotifications: boolean
  signalSound: boolean
  soundEffects: boolean
  signalHistory: boolean
  defaultMarket: 'india' | 'us' | 'crypto'
  defaultTimeframe: string
  defaultRiskPercent: number
  paperTrading: boolean
}
export interface StrategyDefinition {
  id: string; version: string; displayName: string; description: string
  instrument: string; timeframe: string; category: string; settings: Partial<StrategySettings>
}
export interface BrokerConnection { brokerId: string; status: 'not_connected' | 'connecting' | 'connected' | 'expired' | 'error'; updatedAt: number }

export const DEFAULT_PREFERENCES: UserPreferences = {
  appearance: 'dark', signalNotifications: true, signalSound: false, soundEffects: false,
  signalHistory: true, defaultMarket: 'india', defaultTimeframe: '15m', defaultRiskPercent: 1, paperTrading: true,
}
