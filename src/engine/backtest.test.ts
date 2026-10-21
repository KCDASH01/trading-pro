import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, type Candle, type Signal } from '../domain/types'
import { runBacktest } from './backtest'

describe('backtesting execution model', () => {
  it('fills no earlier than the next candle open and uses stop-first collision policy', () => {
    const candles: Candle[] = [
      { time: 1, open: 100, high: 101, low: 99, close: 100, volume: 1, complete: true },
      { time: 2, open: 101, high: 106, low: 96, close: 103, volume: 1, complete: true },
    ]
    const signal: Signal = { id: 'one', symbol: 'TEST', exchange: 'TEST', timeframe: '1m', direction: 'BUY', timestamp: 1, entry: 100, stopLoss: 95, target: 110, riskReward: 2, agreementScore: 100, indicators: { emaFast: 1, emaSlow: 0, rsi: 60, macd: 1, macdSignal: 0, macdHistogram: 1, atr: 2, supertrend: 98, supertrendBullish: true }, strategyVersion: 'test', status: 'NEW' }
    const result = runBacktest(candles, [signal], { ...DEFAULT_SETTINGS, slippagePercent: 0, feesPercent: 0 })
    expect(result.trades[0].fillTime).toBe(2)
    expect(result.trades[0].entry).toBe(101)
    expect(result.trades[0].outcome).toBe('LOSS')
    expect(result.trades[0].exitPrice).toBe(96)
  })
})
