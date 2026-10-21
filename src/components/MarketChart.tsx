import { useEffect, useRef } from 'react'
import { CandlestickSeries, ColorType, createChart, createSeriesMarkers, LineSeries, type Time } from 'lightweight-charts'
import type { Candle, Signal } from '../domain/types'
import { calculateIndicators } from '../engine/indicators'

interface Props { candles: Candle[]; signals: Signal[]; fast: number; slow: number }

export function MarketChart({ candles, signals, fast, slow }: Props) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!container.current) return
    const chart = createChart(container.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#0b111d' }, textColor: '#7f8da5', attributionLogo: false },
      grid: { vertLines: { color: '#172235' }, horzLines: { color: '#172235' } },
      rightPriceScale: { borderColor: '#26344c' }, timeScale: { borderColor: '#26344c', timeVisible: true },
      crosshair: { vertLine: { color: '#496078' }, horzLine: { color: '#496078' } },
    })
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#26c281', downColor: '#ef5b68', borderVisible: false, wickUpColor: '#26c281', wickDownColor: '#ef5b68' })
    candleSeries.setData(candles.map((candle) => ({ time: candle.time as Time, open: candle.open, high: candle.high, low: candle.low, close: candle.close })))
    const indicators = calculateIndicators(candles, fast, slow)
    const fastSeries = chart.addSeries(LineSeries, { color: '#35a7ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
    const slowSeries = chart.addSeries(LineSeries, { color: '#f4b740', lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
    fastSeries.setData(indicators.flatMap((item, index) => item.emaFast === null ? [] : [{ time: candles[index].time as Time, value: item.emaFast }]))
    slowSeries.setData(indicators.flatMap((item, index) => item.emaSlow === null ? [] : [{ time: candles[index].time as Time, value: item.emaSlow }]))
    createSeriesMarkers(candleSeries, signals.map((signal) => ({ time: signal.timestamp as Time, position: signal.direction === 'BUY' ? 'belowBar' as const : 'aboveBar' as const, color: signal.direction === 'BUY' ? '#26c281' : '#ef5b68', shape: signal.direction === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const, text: signal.direction })))
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [candles, signals, fast, slow])
  return <div className="chart" ref={container} aria-label="Demo candlestick chart" />
}
