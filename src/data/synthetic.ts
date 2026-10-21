import type { Candle, Timeframe } from '../domain/types'

const intervals: Record<Timeframe, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '1d': 86400 }
const bases: Record<string, number> = { NIFTY: 25800, BANKNIFTY: 57900, SENSEX: 84300 }

export function syntheticCandles(symbol = 'NIFTY', timeframe: Timeframe = '15m', count = 240): Candle[] {
  let seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 41)
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const interval = intervals[timeframe]
  const end = Math.floor(Date.UTC(2026, 9, 20, 10, 0) / 1000 / interval) * interval
  let close = bases[symbol] ?? 25000
  return Array.from({ length: count }, (_, index) => {
    const time = end - (count - index) * interval
    const cycle = Math.sin(index / 9) * 0.0009 + Math.sin(index / 31) * 0.0014
    const change = cycle + (random() - 0.48) * 0.0022
    const open = close
    close = open * (1 + change)
    const spread = open * (0.0005 + random() * 0.0015)
    return { time, open, close, high: Math.max(open, close) + spread, low: Math.min(open, close) - spread, volume: Math.round(50000 + random() * 150000), complete: true }
  })
}
