import type { Order, Trade, Candle } from '../types'
import { useOrderBookStore } from '../store/orderBookStore'

class MatchingEngine {
  private tpsCounter = 0
  private lastTpsUpdate = Date.now()

  async processOrder(order: Order): Promise<Trade[]> {
    const startTime = performance.now()
    const store = useOrderBookStore.getState()
    const trades: Trade[] = []
    let remainingAmount = order.amount

    const pair = order.pair
    const bids = store.bids.get(pair) || []
    const asks = store.asks.get(pair) || []

    // Handle stop-loss and take-profit orders
    if (order.type === 'stop-loss' || order.type === 'take-profit') {
      // These are triggered when price reaches stopPrice
      const currentPrice = store.currentPair.basePrice
      const shouldTrigger = order.type === 'stop-loss'
        ? (order.side === 'sell' ? currentPrice <= order.stopPrice! : currentPrice >= order.stopPrice!)
        : (order.side === 'sell' ? currentPrice >= order.stopPrice! : currentPrice <= order.stopPrice!)
      
      if (!shouldTrigger) {
        // Add as pending order
        store.addOrder({ ...order, status: 'open', filledAmount: 0 })
        return []
      }
    }

    // Handle trailing stop
    if (order.type === 'trailing-stop' && order.trailingPercent) {
      const currentPrice = store.currentPair.basePrice
      const trailPrice = order.side === 'sell'
        ? currentPrice * (1 - order.trailingPercent / 100)
        : currentPrice * (1 + order.trailingPercent / 100)
      order.stopPrice = trailPrice
    }

    if (order.side === 'buy') {
      const matchingAsks = asks.filter(a => a.price <= order.price && a.status === 'open')
      
      for (const ask of matchingAsks) {
        if (remainingAmount <= 0) break
        
        const fillAmount = Math.min(remainingAmount, ask.amount - ask.filledAmount)
        const trade: Trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price: ask.price,
          amount: fillAmount,
          side: 'buy',
          timestamp: Date.now(),
          buyer: order.trader,
          seller: ask.trader,
          pair,
        }
        
        trades.push(trade)
        store.addTrade(trade)
        this.updateCandle(pair, trade)
        remainingAmount -= fillAmount
        
        const newFilledAmount = ask.filledAmount + fillAmount
        if (newFilledAmount >= ask.amount) {
          store.removeOrder(ask.id)
        } else {
          store.updateOrder(ask.id, { filledAmount: newFilledAmount, status: 'partial' })
        }
        
        this.tpsCounter++
      }
    } else {
      const matchingBids = bids.filter(b => b.price >= order.price && b.status === 'open')
      
      for (const bid of matchingBids) {
        if (remainingAmount <= 0) break
        
        const fillAmount = Math.min(remainingAmount, bid.amount - bid.filledAmount)
        const trade: Trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          price: bid.price,
          amount: fillAmount,
          side: 'sell',
          timestamp: Date.now(),
          buyer: bid.trader,
          seller: order.trader,
          pair,
        }
        
        trades.push(trade)
        store.addTrade(trade)
        this.updateCandle(pair, trade)
        remainingAmount -= fillAmount
        
        const newFilledAmount = bid.filledAmount + fillAmount
        if (newFilledAmount >= bid.amount) {
          store.removeOrder(bid.id)
        } else {
          store.updateOrder(bid.id, { filledAmount: newFilledAmount, status: 'partial' })
        }
        
        this.tpsCounter++
      }
    }

    // Add remaining as limit order
    if (remainingAmount > 0 && order.type === 'limit') {
      const limitOrder: Order = { 
        ...order, 
        amount: remainingAmount,
        status: remainingAmount < order.amount ? 'partial' : 'open',
        filledAmount: order.amount - remainingAmount
      }
      store.addOrder(limitOrder)
      this.tpsCounter++
    }

    // Update TPS and latency
    const now = Date.now()
    const latency = performance.now() - startTime
    store.updateLatency(Math.round(latency * 100) / 100)
    
    if (now - this.lastTpsUpdate >= 1000) {
      store.updateTps(this.tpsCounter)
      this.tpsCounter = 0
      this.lastTpsUpdate = now
    }

    return trades
  }

  private updateCandle(pair: string, trade: Trade) {
    const store = useOrderBookStore.getState()
    const candleTime = Math.floor(trade.timestamp / 60000) * 60000 // 1-minute candles
    
    const candle: Candle = {
      time: candleTime / 1000,
      open: trade.price,
      high: trade.price,
      low: trade.price,
      close: trade.price,
      volume: trade.amount,
    }
    
    store.addCandle(pair, candle)
  }

  generateOrderId(): string {
    return `order-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  // Check and trigger stop orders
  checkStopOrders(pair: string, currentPrice: number) {
    const store = useOrderBookStore.getState()
    const bids = store.bids.get(pair) || []
    const asks = store.asks.get(pair) || []
    
    const allOrders = [...bids, ...asks]
    
    for (const order of allOrders) {
      if (order.status !== 'open') continue
      
      if (order.type === 'stop-loss') {
        const shouldTrigger = order.side === 'sell' 
          ? currentPrice <= order.stopPrice!
          : currentPrice >= order.stopPrice!
        
        if (shouldTrigger) {
          store.removeOrder(order.id)
          this.processOrder({ ...order, type: 'market', price: currentPrice })
        }
      }
      
      if (order.type === 'take-profit') {
        const shouldTrigger = order.side === 'sell'
          ? currentPrice >= order.stopPrice!
          : currentPrice <= order.stopPrice!
        
        if (shouldTrigger) {
          store.removeOrder(order.id)
          this.processOrder({ ...order, type: 'market', price: currentPrice })
        }
      }
    }
  }
}

export const matchingEngine = new MatchingEngine()
