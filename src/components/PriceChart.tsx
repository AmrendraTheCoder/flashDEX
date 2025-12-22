import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { useOrderBookStore } from '../store/orderBookStore'

type Timeframe = '1m' | '5m' | '15m' | '1h'

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
}

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  const [chartData, setChartData] = useState<any[]>([])
  const { currentPair, trades } = useOrderBookStore()
  
  const currentTrades = trades.get(currentPair.symbol) || []
  const basePrice = currentPair.basePrice

  // Generate realistic initial candles based on timeframe
  const generateInitialCandles = useCallback((tf: Timeframe) => {
    const now = Math.floor(Date.now() / 1000)
    const interval = TIMEFRAME_SECONDS[tf]
    const candles = []
    const volumes = []
    let price = basePrice * 0.98
    
    const candleCount = tf === '1h' ? 48 : tf === '15m' ? 96 : tf === '5m' ? 144 : 200
    
    for (let i = candleCount; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / interval) * interval
      const volatility = tf === '1h' ? 0.008 : tf === '15m' ? 0.005 : tf === '5m' ? 0.003 : 0.002
      const trend = Math.sin(i / 20) * volatility
      const noise = (Math.random() - 0.5) * volatility * 2
      const change = trend + noise
      
      const open = price
      price = price * (1 + change)
      const close = price
      const high = Math.max(open, close) * (1 + Math.random() * volatility)
      const low = Math.min(open, close) * (1 - Math.random() * volatility)
      const volume = (50 + Math.random() * 200) * (interval / 60)
      
      candles.push({ time, open, high, low, close })
      volumes.push({
        time,
        value: volume,
        color: close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      })
    }
    
    return { candles, volumes }
  }, [basePrice])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: 'rgba(107, 114, 128, 0.1)' },
        horzLines: { color: 'rgba(107, 114, 128, 0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#6366f1', width: 1, style: 3, labelBackgroundColor: '#6366f1' },
        horzLine: { color: '#6366f1', width: 1, style: 3, labelBackgroundColor: '#6366f1' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    // Set initial data based on timeframe
    const { candles, volumes } = generateInitialCandles(timeframe)
    setChartData(candles)
    candleSeries.setData(candles)
    volumeSeries.setData(volumes)
    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [currentPair.symbol, timeframe, generateInitialCandles])

  // Update chart with new trades
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || currentTrades.length === 0) return

    const latestTrade = currentTrades[0]
    if (!latestTrade) return

    const now = Math.floor(Date.now() / 1000)
    const candleTime = Math.floor(now / 60) * 60

    setChartData(prev => {
      const newData = [...prev]
      const lastCandle = newData[newData.length - 1]

      if (lastCandle && lastCandle.time === candleTime) {
        // Update existing candle
        lastCandle.high = Math.max(lastCandle.high, latestTrade.price)
        lastCandle.low = Math.min(lastCandle.low, latestTrade.price)
        lastCandle.close = latestTrade.price
      } else if (!lastCandle || candleTime > lastCandle.time) {
        // Add new candle
        const open = lastCandle ? lastCandle.close : latestTrade.price
        newData.push({
          time: candleTime,
          open,
          high: Math.max(open, latestTrade.price),
          low: Math.min(open, latestTrade.price),
          close: latestTrade.price,
        })
      }

      // Update chart
      if (candleSeriesRef.current) {
        candleSeriesRef.current.update(newData[newData.length - 1])
      }
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: candleTime,
          value: latestTrade.amount * 100,
          color: latestTrade.side === 'buy' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        })
      }

      return newData.slice(-300)
    })
  }, [currentTrades])

  const lastCandle = chartData[chartData.length - 1]
  const prevCandle = chartData[chartData.length - 2]
  const priceChange = lastCandle && prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100) : 0

  return (
    <div className="price-chart">
      <div className="chart-toolbar">
        <div className="chart-info">
          <span className="chart-price">${basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span className={`chart-change ${priceChange >= 0 ? 'up' : 'down'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        <div className="chart-controls">
          <div className="timeframe-group">
            {(['1m', '5m', '15m', '1h'] as Timeframe[]).map(tf => (
              <button
                key={tf}
                className={timeframe === tf ? 'active' : ''}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-canvas" />
    </div>
  )
}
