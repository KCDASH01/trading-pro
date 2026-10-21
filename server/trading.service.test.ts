import { describe, expect, it } from 'vitest'
import { TradingService } from './trading.service'

describe('authoritative trading service', () => {
  it('owns signals, indicators, statistics, and backtest output', () => {
    const snapshot = new TradingService().snapshot('NIFTY', '15m')
    expect(snapshot.source).toBe('backend-authoritative')
    expect(snapshot.candles.length).toBe(240)
    expect(snapshot.indicators.length).toBe(snapshot.candles.length)
    expect(snapshot.signals.length).toBeGreaterThan(0)
    expect(snapshot.backtest.totalTrades).toBeGreaterThan(0)
  })

  it('normalizes unsupported instruments and unsafe numeric settings', () => {
    const normalized = new TradingService().normalize('UNKNOWN', '2m', { fastEma: -1 })
    expect(normalized.symbol).toBe('NIFTY')
    expect(normalized.timeframe).toBe('15m')
    expect(normalized.settings.fastEma).toBe(9)
  })
})
