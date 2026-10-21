import type { Candle, Signal, StrategySettings } from '../domain/types'

export interface BacktestTrade extends Signal {
  fillTime: number
  exitTime: number
  exitPrice: number
  outcome: 'WIN' | 'LOSS' | 'OPEN'
  pnl: number
  returnPercent: number
}

export interface BacktestResult {
  trades: BacktestTrade[]
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  netProfit: number
  profitFactor: number
  maxDrawdown: number
  expectancy: number
  equityCurve: Array<{ time: number; value: number }>
}

export function runBacktest(candles: Candle[], signals: Signal[], settings: StrategySettings, initialCapital = 100000): BacktestResult {
  let capital = initialCapital
  let peak = capital
  let maxDrawdown = 0
  const trades: BacktestTrade[] = []
  const equityCurve = [{ time: candles[0]?.time ?? 0, value: capital }]
  for (const signal of signals) {
    const signalIndex = candles.findIndex((candle) => candle.time === signal.timestamp)
    if (signalIndex < 0 || signalIndex + 1 >= candles.length) continue
    const fillCandle = candles[signalIndex + 1]
    const slippage = fillCandle.open * settings.slippagePercent / 100
    const fill = fillCandle.open + (signal.direction === 'BUY' ? slippage : -slippage)
    const riskDistance = Math.abs(signal.entry - signal.stopLoss)
    const stop = signal.direction === 'BUY' ? fill - riskDistance : fill + riskDistance
    const target = signal.direction === 'BUY' ? fill + riskDistance * signal.riskReward : fill - riskDistance * signal.riskReward
    const riskBudget = capital * settings.riskPercent / 100
    const quantity = riskDistance > 0 ? riskBudget / riskDistance : 0
    let exit = candles.at(-1)!.close
    let exitTime = candles.at(-1)!.time
    let outcome: BacktestTrade['outcome'] = 'OPEN'
    for (let index = signalIndex + 1; index < candles.length; index += 1) {
      const candle = candles[index]
      const hitStop = signal.direction === 'BUY' ? candle.low <= stop : candle.high >= stop
      const hitTarget = signal.direction === 'BUY' ? candle.high >= target : candle.low <= target
      if (hitStop || hitTarget) {
        // Conservative policy: when both occur in one candle, the stop is assumed first.
        outcome = hitStop ? 'LOSS' : 'WIN'
        exit = hitStop ? stop : target
        exitTime = candle.time
        break
      }
    }
    const gross = (signal.direction === 'BUY' ? exit - fill : fill - exit) * quantity
    const fees = (Math.abs(fill * quantity) + Math.abs(exit * quantity)) * settings.feesPercent / 100
    const pnl = gross - fees
    capital += pnl
    peak = Math.max(peak, capital)
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - capital) / peak * 100)
    trades.push({ ...signal, entry: fill, stopLoss: stop, target, fillTime: fillCandle.time, exitTime, exitPrice: exit, outcome, pnl, returnPercent: pnl / initialCapital * 100 })
    equityCurve.push({ time: exitTime, value: capital })
  }
  const wins = trades.filter((trade) => trade.pnl > 0)
  const losses = trades.filter((trade) => trade.pnl <= 0)
  const grossProfit = wins.reduce((sum, trade) => sum + trade.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0))
  return {
    trades, totalTrades: trades.length, wins: wins.length, losses: losses.length,
    winRate: trades.length ? wins.length / trades.length * 100 : 0,
    netProfit: capital - initialCapital, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
    maxDrawdown, expectancy: trades.length ? (capital - initialCapital) / trades.length : 0, equityCurve,
  }
}
