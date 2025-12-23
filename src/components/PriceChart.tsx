import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import type { Time } from 'lightweight-charts'
import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { useOnChainTrades } from '../hooks/useOrderBook'

type Timeframe = '1m' | '5m' | '15m' | '1h'

const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
}

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const lastUpdateRef = useRef<number>(0)
  const [timeframe, setTimeframe] = useState<Timeframe>('1m')
  const [chartData, setChartData] = useState<any[]>([])
  const { currentPair, trades } = useOrderBookStore()
  const { useOnChain } = useUIStore()
  
  // On-chain trades
  const { trades: onChainTrades } = useOnChainTrades(50)
  
  // Format on-chain trades
  const formattedOnChainTrades = onChainTrades.map(t => ({
    id: `chain-${t.id}`,
    price: t.price,
    amount: t.amount,
    timestamp: t.timestamp,
    side: t.buyOrderId > t.sellOrderId ? 'buy' : 'sell' as 'buy' | 'sell',
  }))
  
  const offChainTrades = trades.get(currentPair.symbol) || []
  const currentTrades = useOnChain ? formattedOnChainTrades : offChainTrades
  const basePrice = currentPair.basePrice

  // Generate realistic initial candles based on timeframe
  const generateInitialCandles = useCallback((tf: Timeframe, startPrice: number) => {
    const now = Math.floor(Date.now() / 1000)
    const interval = TIMEFRAME_SECONDS[tf]
    const candles = []
    const volumes = []
    let price = startPrice * 0.95
    
    const candleCount = tf === '1h' ? 48 : tf === '15m' ? 96 : tf === '5m' ? 144 : 200
    
    for (let i = candleCount; i >= 0; i--) {
      const time = Math.floor((now - i * interval) / interval) * interval
      const volatility = tf === '1h' ? 0.012 : tf === '15m' ? 0.008 : tf === '5m' ? 0.005 : 0.003
      const trend = Math.sin(i / 15) * volatility * 0.5
      const noise = (Math.random() - 0.5) * volatility * 2
      const change = trend + noise
      
      const open = price
      price = price * (1 + change)
      
      // Gradually move towards current price
      if (i < 20) {
        price = price + (startPrice - price) * 0.05
      }
      
      const close = price
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5)
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5)
      const volume = (50 + Math.random() * 200) * (interval / 60)
      
      candles.push({ time, open, high, low, close })
      volumes.push({
        time,
        value: volume,
        color: close >= open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      })
    }
    
    return { candles, volumes }
  }, [])

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

    const { candles, volumes } = generateInitialCandles(timeframe, basePrice)
    setChartData(candles)
    candleSeries.setData(candles as { time: Time; open: number; high: number; low: number; close: number }[])
    volumeSeries.setData(volumes as { time: Time; value: number; color: string }[])
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
  }, [currentPair.symbol, timeframe, generateInitialCandles, basePrice])

  // Update chart with new trades from simulation
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return
    if (currentTrades.length === 0) return

    const latestTrade = currentTrades[0]
    if (!latestTrade) return
    
    // Debounce updates
    const now = Date.now()
    if (now - lastUpdateRef.current < 100) return
    lastUpdateRef.current = now

    const tradeTime = Math.floor(latestTrade.timestamp / 1000)
    const candleTime = Math.floor(tradeTime / 60) * 60

    setChartData(prev => {
      if (prev.length === 0) return prev
      
      const newData = [...prev]
      const lastCandle = newData[newData.length - 1]

      if (lastCandle && lastCandle.time === candleTime) {
        // Update existing candle
        const updatedCandle = {
          ...lastCandle,
          high: Math.max(lastCandle.high, latestTrade.price),
          low: Math.min(lastCandle.low, latestTrade.price),
          close: latestTrade.price,
        }
        newData[newData.length - 1] = updatedCandle
        candleSeriesRef.current?.update(updatedCandle)
      } else if (!lastCandle || candleTime > lastCandle.time) {
        // Add new candle
        const open = lastCandle ? lastCandle.close : latestTrade.price
        const newCandle = {
          time: candleTime,
          open,
          high: Math.max(open, latestTrade.price),
          low: Math.min(open, latestTrade.price),
          close: latestTrade.price,
        }
        newData.push(newCandle)
        candleSeriesRef.current?.update(newCandle)
      }

      // Update volume
      volumeSeriesRef.current?.update({
        time: candleTime,
        value: latestTrade.amount * 50,
        color: latestTrade.side === 'buy' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
      })

      return newData.slice(-300)
    })
  }, [currentTrades])

  // Calculate price change
  const lastCandle = chartData[chartData.length - 1]
  const prevCandle = chartData[chartData.length - 2]
  const priceChange = lastCandle && prevCandle 
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100) 
    : 0

  return (
    <div className="price-chart">
      <div className="chart-toolbar">
        <div className="chart-info">
          <span className="chart-price">${basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          <span className={`chart-change ${priceChange >= 0 ? 'up' : 'down'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
          <span className={`chart-mode-badge ${useOnChain ? 'on-chain' : ''}`}>
            {useOnChain ? '🔗' : '⚡'}
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
