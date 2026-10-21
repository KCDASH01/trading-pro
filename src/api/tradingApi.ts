import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import type { Signal, StrategySettings, Timeframe, Candle, IndicatorSnapshot } from '../domain/types'
import type { BacktestResult } from '../engine/backtest'
import { syntheticCandles } from '../data/synthetic'
import { calculateIndicators } from '../engine/indicators'
import { generateSignals } from '../engine/strategy'
import { runBacktest } from '../engine/backtest'

export interface TradingSnapshot {
  source: 'backend-authoritative' | 'offline-demo-fallback'
  marketDataMode: 'demo' | 'live'
  generatedAt: number
  strategyVersion: string
  symbol: string
  timeframe: Timeframe
  settings: StrategySettings
  candles: Candle[]
  indicators: IndicatorSnapshot[]
  signals: Signal[]
  backtest: BacktestResult
}

const API_URL = 'http://127.0.0.1:3100'

function offlineSnapshot(symbol: string, timeframe: Timeframe, settings: StrategySettings): TradingSnapshot {
  const candles = syntheticCandles(symbol, timeframe)
  const indicators = calculateIndicators(candles, settings.fastEma, settings.slowEma, settings.rsiPeriod, settings.atrPeriod, settings.supertrendPeriod, settings.supertrendMultiplier)
  const signals = generateSignals(candles, symbol, 'NSE', timeframe, settings)
  return { source: 'offline-demo-fallback', marketDataMode: 'demo', generatedAt: Date.now(), strategyVersion: 'rule-v1.0-offline', symbol, timeframe, settings, candles, indicators, signals, backtest: runBacktest(candles, signals, settings) }
}

export function useTradingSnapshot(symbol: string, timeframe: Timeframe, settings: StrategySettings, sessionToken?: string) {
  const fallback = useMemo(() => offlineSnapshot(symbol, timeframe, settings), [symbol, timeframe, settings])
  const [snapshot, setSnapshot] = useState<TradingSnapshot>(fallback)
  useEffect(() => {
    let active = true
    const query = new URLSearchParams({ symbol, timeframe, settings: JSON.stringify(settings) })
    fetch(`${API_URL}/api/v1/snapshot?${query}`)
      .then((response) => { if (!response.ok) throw new Error(`Backend returned ${response.status}`); return response.json() as Promise<TradingSnapshot> })
      .then((next) => { if (active && next.source === 'backend-authoritative') setSnapshot(next) })
      .catch(() => { if (active) setSnapshot(fallback) })
    if (!sessionToken) return () => { active = false }
    const socket = io(`${API_URL}/market`, { transports: ['websocket'], reconnection: true, timeout: 2500, auth: { token: sessionToken } })
    socket.on('connect', () => socket.emit('subscribe', { symbol, timeframe, settings }))
    socket.on('snapshot', (next: TradingSnapshot) => { if (active && next.source === 'backend-authoritative') setSnapshot(next) })
    return () => { active = false; socket.disconnect() }
  }, [symbol, timeframe, settings, fallback, sessionToken])
  const matchesRequest = snapshot.symbol === symbol && snapshot.timeframe === timeframe && JSON.stringify(snapshot.settings) === JSON.stringify(settings)
  return matchesRequest ? snapshot : fallback
}
