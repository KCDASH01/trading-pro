import type { Candle, IndicatorSnapshot, Signal, StrategySettings, Timeframe } from '../domain/types'
import { calculateIndicators } from './indicators'

const hasValues = (value: IndicatorSnapshot): value is IndicatorSnapshot & { emaFast: number; emaSlow: number; rsi: number; macdHistogram: number; atr: number; supertrendBullish: boolean } =>
  value.emaFast !== null && value.emaSlow !== null && value.rsi !== null && value.macdHistogram !== null && value.atr !== null && value.supertrendBullish !== null

export function agreement(snapshot: IndicatorSnapshot, direction: 'BUY' | 'SELL', candle: Candle, settings: StrategySettings) {
  if (!hasValues(snapshot)) return 0
  const bullish = direction === 'BUY'
  return (bullish === (snapshot.emaFast > snapshot.emaSlow) ? 25 : 0)
    + (bullish === (snapshot.rsi > 50) ? 20 : 0)
    + (bullish === (snapshot.macdHistogram > 0) ? 20 : 0)
    + (bullish === snapshot.supertrendBullish ? 25 : 0)
    + (snapshot.atr / candle.close * 100 >= settings.minAtrPercent ? 10 : 0)
}

export function generateSignals(candles: Candle[], symbol: string, exchange: string, timeframe: Timeframe, settings: StrategySettings): Signal[] {
  const indicators = calculateIndicators(candles, settings.fastEma, settings.slowEma, settings.rsiPeriod, settings.atrPeriod, settings.supertrendPeriod, settings.supertrendMultiplier)
  const signals: Signal[] = []
  for (let index = 1; index < candles.length; index += 1) {
    if (!candles[index].complete || !hasValues(indicators[index]) || !hasValues(indicators[index - 1])) continue
    const current = indicators[index] as IndicatorSnapshot & { emaFast: number; emaSlow: number; rsi: number; macdHistogram: number; atr: number; supertrendBullish: boolean }
    const previous = indicators[index - 1] as IndicatorSnapshot & { emaFast: number; emaSlow: number; rsi: number; macdHistogram: number; atr: number; supertrendBullish: boolean }
    const bullishCross = previous.emaFast <= previous.emaSlow && current.emaFast > current.emaSlow
    const bearishCross = previous.emaFast >= previous.emaSlow && current.emaFast < current.emaSlow
    const volatility = current.atr / candles[index].close * 100 >= settings.minAtrPercent
    let direction: 'BUY' | 'SELL' | null = null
    if (bullishCross && current.supertrendBullish && current.rsi > 50 && current.macdHistogram > 0 && volatility) direction = 'BUY'
    if (bearishCross && !current.supertrendBullish && current.rsi < 50 && current.macdHistogram < 0 && volatility) direction = 'SELL'
    if (!direction) continue
    const entry = candles[index].close
    const risk = current.atr * settings.stopAtr
    const stopLoss = direction === 'BUY' ? entry - risk : entry + risk
    const target = direction === 'BUY' ? entry + risk * settings.rewardRisk : entry - risk * settings.rewardRisk
    signals.push({
      id: `${symbol}-${timeframe}-${candles[index].time}-${direction}`, symbol, exchange, timeframe, direction,
      timestamp: candles[index].time, entry, stopLoss, target, riskReward: settings.rewardRisk,
      agreementScore: agreement(current, direction, candles[index], settings), indicators: current,
      strategyVersion: 'rule-v1.0', status: 'NEW',
    })
  }
  return signals
}
