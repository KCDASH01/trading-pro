import type { StrategySettings } from '../src/domain/types'
import type { StrategyDefinition } from './product.types'

const definitions: Array<[string, string, string, string, Partial<StrategySettings>]> = [
  ['ema-momentum-scalper','EMA Momentum Scalper','Short-window EMA momentum with volatility confirmation','Momentum',{ fastEma: 5, slowEma: 13 }],
  ['swing-trend-sniper','Swing Trend Sniper','Slower trend alignment for swing conditions','Trend',{ fastEma: 21, slowEma: 50 }],
  ['vwap-momentum','VWAP Momentum','Volume-weighted momentum concept','Momentum',{ fastEma: 9, slowEma: 21 }],
  ['structure-breakout','Structure Breakout','Price-structure continuation concept','Breakout',{ stopAtr: 1.8 }],
  ['explosive-candle','Explosive Candle','Range-expansion candle concept','Volatility',{ minAtrPercent: 0.12 }],
  ['opening-range-breakout','Opening Range Breakout','Opening-session range continuation','Breakout',{ rewardRisk: 1.8 }],
  ['open-close-momentum','Open-Close Momentum','Session direction and closing strength','Momentum',{ fastEma: 8, slowEma: 20 }],
  ['golden-cross-trend','Golden Cross Trend','Long-horizon moving-average trend','Trend',{ fastEma: 50, slowEma: 200 }],
  ['bollinger-mean-reversion','Bollinger Mean Reversion','Volatility-band reversion concept','Mean reversion',{ rewardRisk: 1.5 }],
  ['mother-candle-breakout','Mother Candle Breakout','Inside-range expansion concept','Breakout',{ stopAtr: 1.2 }],
  ['rsi-momentum','RSI Momentum','Relative-strength continuation','Momentum',{ rsiPeriod: 9 }],
  ['multi-ma-crossover','Multi-MA Crossover','Layered moving-average alignment','Trend',{ fastEma: 10, slowEma: 30 }],
  ['market-traffic-light','Market Traffic Light','Multi-factor regime alignment','Regime',{ minAtrPercent: 0.08 }],
  ['fvg-pullback','FVG Pullback','Imbalance pullback concept','Pullback',{ rewardRisk: 2.5 }],
  ['scalping-pulse','Scalping Pulse','Fast momentum pulse for short intervals','Scalping',{ fastEma: 3, slowEma: 8 }],
  ['macd-trend','MACD Trend','MACD trend continuation','Trend',{ fastEma: 12, slowEma: 26 }],
  ['supertrend-momentum','Supertrend Momentum','ATR trend-state continuation','Trend',{ supertrendPeriod: 10, supertrendMultiplier: 3 }],
  ['ema-rsi-confluence','EMA + RSI Confluence','Moving-average and RSI alignment','Confluence',{ fastEma: 9, slowEma: 21, rsiPeriod: 14 }],
]

export const STRATEGIES: StrategyDefinition[] = definitions.map(([id, displayName, description, category, settings]) => ({ id, version: '1.0.0', displayName, description, category, settings, instrument: 'India indices', timeframe: id.includes('scalp') ? '5m' : '15m' }))
