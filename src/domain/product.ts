import type { Signal } from './types'

export type AppMode = 'loading' | 'onboarding' | 'authenticated' | 'broker_detected' | 'broker_connected' | 'session_expired' | 'offline_demo'
export type BrokerId = 'zerodha' | 'upstox' | 'dhan' | 'unknown'
export interface DetectedBroker { id: BrokerId; label: string; hostname: string; supported: boolean }
export interface AppSession { token: string; expiresAt: number; user: { id: string; countryCode: string; mobile: string; verified: boolean } }
export interface StrategyCard {
  id: string; version: string; displayName: string; description: string; instrument: string; timeframe: string; category: string
  applied: boolean; favorite: boolean
}
export interface SignalFeedItem extends Omit<Signal, 'status'> {
  source: 'backend-authoritative'
  strategyId: string; strategyName: string; market: 'india' | 'us' | 'crypto'; optionSide?: 'CALL' | 'PUT'
  strategyWinRate?: number; generatedAt: string; status: 'active' | 'target_hit' | 'stop_hit' | 'expired' | 'closed'
  recommended?: boolean; calibratedProbability?: number | null
}
export interface ProductPreferences {
  appearance: 'light' | 'dark' | 'system'; signalNotifications: boolean; signalSound: boolean; soundEffects: boolean
  signalHistory: boolean; defaultMarket: 'india' | 'us' | 'crypto'; defaultTimeframe: string; defaultRiskPercent: number; paperTrading: boolean
}
export type SignalFilter = 'all' | 'recommended' | 'win-rate' | 'recent' | 'call' | 'put' | 'NIFTY' | 'BANKNIFTY' | 'SENSEX'
