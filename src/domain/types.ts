export type Direction = 'BUY' | 'SELL' | 'NO_TRADE'
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  complete: boolean
}

export interface IndicatorSnapshot {
  emaFast: number | null
  emaSlow: number | null
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  atr: number | null
  supertrend: number | null
  supertrendBullish: boolean | null
}

export interface Signal {
  id: string
  symbol: string
  exchange: string
  timeframe: Timeframe
  direction: Exclude<Direction, 'NO_TRADE'>
  timestamp: number
  entry: number
  stopLoss: number
  target: number
  riskReward: number
  agreementScore: number
  indicators: IndicatorSnapshot
  strategyVersion: string
  status: 'NEW' | 'FILLED' | 'CLOSED' | 'EXPIRED'
}

export interface StrategySettings {
  fastEma: number
  slowEma: number
  rsiPeriod: number
  atrPeriod: number
  supertrendPeriod: number
  supertrendMultiplier: number
  stopAtr: number
  rewardRisk: number
  minAtrPercent: number
  riskPercent: number
  feesPercent: number
  slippagePercent: number
}

export const DEFAULT_SETTINGS: StrategySettings = {
  fastEma: 9, slowEma: 21, rsiPeriod: 14, atrPeriod: 14,
  supertrendPeriod: 10, supertrendMultiplier: 3, stopAtr: 1.5,
  rewardRisk: 2, minAtrPercent: 0.05, riskPercent: 1,
  feesPercent: 0.02, slippagePercent: 0.03,
}
