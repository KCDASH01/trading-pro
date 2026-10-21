import type { Candle, IndicatorSnapshot } from '../domain/types'

const valid = (value: number) => Number.isFinite(value)

export function ema(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null)
  if (!Number.isInteger(period) || period < 1 || values.length < period) return result
  for (let i = 0; i < period; i += 1) if (!valid(values[i])) return result
  let previous = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = previous
  const alpha = 2 / (period + 1)
  for (let i = period; i < values.length; i += 1) {
    if (!valid(values[i])) continue
    previous = values[i] * alpha + previous * (1 - alpha)
    result[i] = previous
  }
  return result
}

export function trueRange(candles: Candle[]): number[] {
  return candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low
    const previousClose = candles[index - 1].close
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose))
  })
}

export function wilder(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null)
  if (!Number.isInteger(period) || period < 1 || values.length < period) return result
  let previous = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = previous
  for (let i = period; i < values.length; i += 1) {
    previous = (previous * (period - 1) + values[i]) / period
    result[i] = previous
  }
  return result
}

export const atr = (candles: Candle[], period = 14) => wilder(trueRange(candles), period)

export function rsi(values: number[], period = 14): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null)
  if (values.length <= period || period < 1) return result
  let gain = 0
  let loss = 0
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1]
    gain += Math.max(change, 0)
    loss += Math.max(-change, 0)
  }
  let averageGain = gain / period
  let averageLoss = loss / period
  const score = () => averageLoss === 0 ? 100 : averageGain === 0 ? 0 : 100 - 100 / (1 + averageGain / averageLoss)
  result[period] = score()
  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1]
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period
    result[i] = score()
  }
  return result
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastLine = ema(values, fast)
  const slowLine = ema(values, slow)
  const line = values.map((_, index) => fastLine[index] !== null && slowLine[index] !== null ? fastLine[index]! - slowLine[index]! : null)
  const first = line.findIndex((value) => value !== null)
  const signalValues = first < 0 ? [] : ema(line.slice(first) as number[], signalPeriod)
  const signal = line.map((_, index) => index < first ? null : (signalValues[index - first] ?? null))
  const histogram = line.map((value, index) => value !== null && signal[index] !== null ? value - signal[index]! : null)
  return { line, signal, histogram }
}

export function supertrend(candles: Candle[], period = 10, multiplier = 3) {
  const atrValues = atr(candles, period)
  const value: Array<number | null> = Array(candles.length).fill(null)
  const bullish: Array<boolean | null> = Array(candles.length).fill(null)
  let finalUpper = 0
  let finalLower = 0
  for (let i = period - 1; i < candles.length; i += 1) {
    const currentAtr = atrValues[i]
    if (currentAtr === null) continue
    const midpoint = (candles[i].high + candles[i].low) / 2
    const upper = midpoint + multiplier * currentAtr
    const lower = midpoint - multiplier * currentAtr
    if (i === period - 1) {
      finalUpper = upper
      finalLower = lower
      bullish[i] = candles[i].close >= midpoint
    } else {
      finalUpper = upper < finalUpper || candles[i - 1].close > finalUpper ? upper : finalUpper
      finalLower = lower > finalLower || candles[i - 1].close < finalLower ? lower : finalLower
      bullish[i] = value[i - 1] === finalUpper
        ? candles[i].close > finalUpper
        : candles[i].close >= finalLower
    }
    value[i] = bullish[i] ? finalLower : finalUpper
  }
  return { value, bullish }
}

export function calculateIndicators(candles: Candle[], fast = 9, slow = 21, rsiPeriod = 14, atrPeriod = 14, stPeriod = 10, stMultiplier = 3): IndicatorSnapshot[] {
  const closes = candles.map((candle) => candle.close)
  const fastValues = ema(closes, fast)
  const slowValues = ema(closes, slow)
  const rsiValues = rsi(closes, rsiPeriod)
  const macdValues = macd(closes)
  const atrValues = atr(candles, atrPeriod)
  const st = supertrend(candles, stPeriod, stMultiplier)
  return candles.map((_, index) => ({
    emaFast: fastValues[index], emaSlow: slowValues[index], rsi: rsiValues[index],
    macd: macdValues.line[index], macdSignal: macdValues.signal[index], macdHistogram: macdValues.histogram[index],
    atr: atrValues[index], supertrend: st.value[index], supertrendBullish: st.bullish[index],
  }))
}
