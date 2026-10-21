import { describe, expect, it } from 'vitest'
import { atr, ema, macd, rsi } from './indicators'
import type { Candle } from '../domain/types'

const candle = (close: number, index: number): Candle => ({ time: index, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000, complete: true })

describe('indicator reference calculations', () => {
  it('initializes EMA with an SMA and applies the standard multiplier', () => {
    expect(ema([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('returns a Wilder RSI of 100 for an uninterrupted gain series', () => {
    const result = rsi(Array.from({ length: 20 }, (_, index) => index + 1), 14)
    expect(result[13]).toBeNull()
    expect(result[14]).toBe(100)
    expect(result[19]).toBe(100)
  })

  it('calculates Wilder ATR from true ranges', () => {
    const candles = [10, 11, 12, 13].map(candle)
    expect(atr(candles, 3)).toEqual([null, null, 2, 2])
  })

  it('keeps MACD output unavailable until both slow and signal windows exist', () => {
    const result = macd(Array.from({ length: 40 }, (_, index) => index + 1))
    expect(result.line[24]).toBeNull()
    expect(result.line[25]).toBeCloseTo(7)
    expect(result.signal[32]).toBeNull()
    expect(result.signal[33]).toBeCloseTo(7)
    expect(result.histogram[33]).toBeCloseTo(0)
  })
})
