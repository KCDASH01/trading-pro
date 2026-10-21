import { describe, expect, it } from 'vitest'
import type { SignalFeedItem } from '../domain/product'
import { filterSignals } from './signalFilters'
import { addNotifiedId, shouldNotify } from './notificationDeduper'

const signal = (patch: Partial<SignalFeedItem> = {}): SignalFeedItem => ({ id: 'one', source: 'backend-authoritative', strategyId: 's', strategyName: 'Strategy', strategyVersion: '1', market: 'india', symbol: 'NIFTY', exchange: 'NSE', timeframe: '15m', direction: 'BUY', optionSide: 'CALL', timestamp: 1, generatedAt: new Date().toISOString(), entry: 100, stopLoss: 95, target: 110, riskReward: 2, agreementScore: 90, strategyWinRate: 60, indicators: { emaFast: 2, emaSlow: 1, rsi: 55, macd: 1, macdSignal: 0, macdHistogram: 1, atr: 2, supertrend: 98, supertrendBullish: true }, status: 'active', recommended: true, ...patch })
describe('signal filters and notification deduplication', () => {
  const signals = [signal(), signal({ id: 'two', symbol: 'SENSEX', optionSide: 'PUT', direction: 'SELL', recommended: false, strategyWinRate: 40 })]
  it('filters recommended, win-rate, option-side, and symbols', () => { expect(filterSignals(signals, 'recommended')).toHaveLength(1); expect(filterSignals(signals, 'win-rate')).toHaveLength(1); expect(filterSignals(signals, 'put')[0].id).toBe('two'); expect(filterSignals(signals, 'SENSEX')[0].id).toBe('two') })
  it('only notifies once for backend-originated signals', () => { expect(shouldNotify([], 'one', 'backend-authoritative')).toBe(true); const ids = addNotifiedId([], 'one'); expect(shouldNotify(ids, 'one', 'backend-authoritative')).toBe(false); expect(addNotifiedId(ids, 'one')).toEqual(ids); expect(shouldNotify([], 'one', 'offline-demo-fallback')).toBe(false) })
})
