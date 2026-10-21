import { DEFAULT_SETTINGS, type StrategySettings, type Timeframe } from '../src/domain/types'
import { syntheticCandles } from '../src/data/synthetic'
import { calculateIndicators } from '../src/engine/indicators'
import { generateSignals } from '../src/engine/strategy'
import { runBacktest } from '../src/engine/backtest'

const allowedSymbols = new Set(['NIFTY', 'BANKNIFTY', 'SENSEX'])
const allowedTimeframes = new Set<Timeframe>(['1m', '5m', '15m', '1h', '1d'])

export class TradingService {
  normalize(symbol?: string, timeframe?: string, input?: Partial<StrategySettings>) {
    return {
      symbol: allowedSymbols.has(symbol ?? '') ? symbol! : 'NIFTY',
      timeframe: allowedTimeframes.has(timeframe as Timeframe) ? timeframe as Timeframe : '15m',
      settings: { ...DEFAULT_SETTINGS, ...this.numericSettings(input) },
    }
  }

  snapshot(symbol?: string, timeframe?: string, input?: Partial<StrategySettings>) {
    const query = this.normalize(symbol, timeframe, input)
    const candles = syntheticCandles(query.symbol, query.timeframe, 240)
    const indicators = calculateIndicators(candles, query.settings.fastEma, query.settings.slowEma, query.settings.rsiPeriod, query.settings.atrPeriod, query.settings.supertrendPeriod, query.settings.supertrendMultiplier)
    const signals = generateSignals(candles, query.symbol, 'NSE', query.timeframe, query.settings)
    const backtest = runBacktest(candles, signals, query.settings)
    return {
      source: 'backend-authoritative' as const,
      marketDataMode: 'demo' as const,
      generatedAt: Date.now(),
      strategyVersion: 'rule-v1.0',
      ...query, candles, indicators, signals, backtest,
    }
  }

  private numericSettings(input?: Partial<StrategySettings>) {
    if (!input) return {}
    return Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) as Partial<StrategySettings>
  }
}
