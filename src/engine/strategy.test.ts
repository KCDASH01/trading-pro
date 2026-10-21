import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/types'
import { syntheticCandles } from '../data/synthetic'
import { generateSignals } from './strategy'

describe('closed-candle signal engine', () => {
  it('is deterministic and creates unique, fully risk-defined signals', () => {
    const candles = syntheticCandles('NIFTY', '15m', 240)
    const first = generateSignals(candles, 'NIFTY', 'NSE', '15m', DEFAULT_SETTINGS)
    const second = generateSignals(candles, 'NIFTY', 'NSE', '15m', DEFAULT_SETTINGS)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
    expect(new Set(first.map((signal) => signal.id)).size).toBe(first.length)
    for (const signal of first) {
      expect(signal.riskReward).toBe(2)
      expect(signal.agreementScore).toBe(100)
      expect(signal.direction === 'BUY' ? signal.stopLoss < signal.entry : signal.stopLoss > signal.entry).toBe(true)
    }
  })

  it('never emits a signal from an incomplete candle', () => {
    const candles = syntheticCandles('BANKNIFTY', '5m', 240)
    candles.forEach((item) => { item.complete = false })
    expect(generateSignals(candles, 'BANKNIFTY', 'NSE', '5m', DEFAULT_SETTINGS)).toHaveLength(0)
  })
})
