import type { SignalFeedItem, SignalFilter } from '../domain/product'

export function filterSignals(signals: SignalFeedItem[], filter: SignalFilter, now = Date.now()) {
  return signals.filter((signal) => {
    if (filter === 'all') return true
    if (filter === 'recommended') return signal.recommended === true
    if (filter === 'win-rate') return (signal.strategyWinRate ?? 0) >= 50
    if (filter === 'recent') return now - new Date(signal.generatedAt).getTime() <= 24 * 60 * 60_000
    if (filter === 'call' || filter === 'put') return signal.optionSide === filter.toUpperCase()
    return signal.symbol === filter
  })
}
