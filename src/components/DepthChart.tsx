import { useEffect, useRef, useMemo } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'

export function DepthChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentPair, bids, asks } = useOrderBookStore()
  
  const currentBids = bids.get(currentPair.symbol) || []
  const currentAsks = asks.get(currentPair.symbol) || []
  const midPrice = currentPair.basePrice

  // Calculate depth data
  const depthData = useMemo(() => {
    const sortedBids = [...currentBids].sort((a, b) => b.price - a.price)
    const sortedAsks = [...currentAsks].sort((a, b) => a.price - b.price)

    let bidCumulative = 0
    const bidDepth = sortedBids.map(order => {
      bidCumulative += order.amount
      return { price: order.price, cumulative: bidCumulative }
    })

    let askCumulative = 0
    const askDepth = sortedAsks.map(order => {
      askCumulative += order.amount
      return { price: order.price, cumulative: askCumulative }
    })

    return { bidDepth, askDepth, maxCumulative: Math.max(bidCumulative, askCumulative, 1) }
  }, [currentBids, currentAsks])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 10, right: 10, bottom: 30, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear
    ctx.clearRect(0, 0, width, height)

    const { bidDepth, askDepth, maxCumulative } = depthData

    if (bidDepth.length === 0 && askDepth.length === 0) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Start simulation to see depth', width / 2, height / 2)
      return
    }

    // Calculate price range
    const allPrices = [...bidDepth.map(d => d.price), ...askDepth.map(d => d.price)]
    const minPrice = Math.min(...allPrices, midPrice * 0.99)
    const maxPrice = Math.max(...allPrices, midPrice * 1.01)
    const priceRange = maxPrice - minPrice

    const priceToX = (price: number) => padding.left + ((price - minPrice) / priceRange) * chartWidth
    const volumeToY = (vol: number) => padding.top + chartHeight - (vol / maxCumulative) * chartHeight

    // Draw grid
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // Draw bid area (green)
    if (bidDepth.length > 0) {
      ctx.beginPath()
      ctx.moveTo(priceToX(bidDepth[0].price), volumeToY(0))
      
      bidDepth.forEach((point, i) => {
        const x = priceToX(point.price)
        const y = volumeToY(point.cumulative)
        if (i === 0) {
          ctx.lineTo(x, y)
        } else {
          ctx.lineTo(x, volumeToY(bidDepth[i - 1].cumulative))
          ctx.lineTo(x, y)
        }
      })
      
      const lastBid = bidDepth[bidDepth.length - 1]
      ctx.lineTo(priceToX(lastBid.price), volumeToY(0))
      ctx.closePath()

      const bidGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
      bidGradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)')
      bidGradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)')
      ctx.fillStyle = bidGradient
      ctx.fill()

      // Bid line
      ctx.beginPath()
      bidDepth.forEach((point, i) => {
        const x = priceToX(point.price)
        const y = volumeToY(point.cumulative)
        if (i === 0) ctx.moveTo(x, y)
        else {
          ctx.lineTo(x, volumeToY(bidDepth[i - 1].cumulative))
          ctx.lineTo(x, y)
        }
      })
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw ask area (red)
    if (askDepth.length > 0) {
      ctx.beginPath()
      ctx.moveTo(priceToX(askDepth[0].price), volumeToY(0))
      
      askDepth.forEach((point, i) => {
        const x = priceToX(point.price)
        const y = volumeToY(point.cumulative)
        if (i === 0) {
          ctx.lineTo(x, y)
        } else {
          ctx.lineTo(x, volumeToY(askDepth[i - 1].cumulative))
          ctx.lineTo(x, y)
        }
      })
      
      const lastAsk = askDepth[askDepth.length - 1]
      ctx.lineTo(priceToX(lastAsk.price), volumeToY(0))
      ctx.closePath()

      const askGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
      askGradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)')
      askGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)')
      ctx.fillStyle = askGradient
      ctx.fill()

      // Ask line
      ctx.beginPath()
      askDepth.forEach((point, i) => {
        const x = priceToX(point.price)
        const y = volumeToY(point.cumulative)
        if (i === 0) ctx.moveTo(x, y)
        else {
          ctx.lineTo(x, volumeToY(askDepth[i - 1].cumulative))
          ctx.lineTo(x, y)
        }
      })
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw mid price line
    const midX = priceToX(midPrice)
    ctx.beginPath()
    ctx.moveTo(midX, padding.top)
    ctx.lineTo(midX, height - padding.bottom)
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Labels
    ctx.fillStyle = '#6b7280'
    ctx.font = '10px Inter'
    ctx.textAlign = 'center'
    
    // Price labels
    const priceSteps = 5
    for (let i = 0; i <= priceSteps; i++) {
      const price = minPrice + (priceRange / priceSteps) * i
      const x = priceToX(price)
      ctx.fillText(`$${price.toFixed(0)}`, x, height - 10)
    }

    // Volume labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const vol = (maxCumulative / 4) * (4 - i)
      const y = padding.top + (chartHeight / 4) * i
      ctx.fillText(vol.toFixed(1), padding.left - 5, y + 4)
    }

  }, [depthData, midPrice])

  // Stats
  const totalBidVolume = currentBids.reduce((sum, o) => sum + o.amount * o.price, 0)
  const totalAskVolume = currentAsks.reduce((sum, o) => sum + o.amount * o.price, 0)
  const imbalance = totalBidVolume + totalAskVolume > 0 
    ? ((totalBidVolume - totalAskVolume) / (totalBidVolume + totalAskVolume) * 100)
    : 0

  return (
    <div className="depth-chart">
      <div className="depth-header">
        <h3>Market Depth</h3>
        <div className="depth-stats">
          <span className={`imbalance-badge ${imbalance > 0 ? 'bullish' : 'bearish'}`}>
            {imbalance > 0 ? 'Buy' : 'Sell'} Pressure {Math.abs(imbalance).toFixed(1)}%
          </span>
        </div>
      </div>
      <canvas ref={canvasRef} className="depth-canvas" />
      <div className="depth-legend">
        <span className="legend-bid">Bids: {depthData.bidDepth.length}</span>
        <span className="legend-mid">${midPrice.toFixed(2)}</span>
        <span className="legend-ask">Asks: {depthData.askDepth.length}</span>
      </div>
    </div>
  )
}
