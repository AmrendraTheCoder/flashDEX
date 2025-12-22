import type { Order } from '../types'
import { matchingEngine } from './matchingEngine'
import { useOrderBookStore } from '../store/orderBookStore'

const BOT_NAMES = [
  'AlphaBot', 'BetaTrader', 'GammaHFT', 'DeltaMaker', 'EpsilonArb',
  'ZetaQuant', 'EtaFlow', 'ThetaSniper', 'IotaScalper', 'KappaWhale'
]

interface Bot {
  name: string
  balance: number
  positions: Map<string, { amount: number; avgPrice: number }>
  pnl: number
  trades: number
  wins: number
}

class TradingBots {
  private bots: Bot[] = []
  private isRunning = false
  private intervalId: number | null = null
  private basePrices: Map<string, number> = new Map()
  private volatility = 0.0015

  constructor() {
    this.bots = BOT_NAMES.map(name => ({
      name,
      balance: 100000,
      positions: new Map(),
      pnl: 0,
      trades: 0,
      wins: 0,
    }))
  }

  start(ordersPerSecond: number = 100) {
    if (this.isRunning) return
    this.isRunning = true
    
    const store = useOrderBookStore.getState()
    store.pairs.forEach(pair => {
      this.basePrices.set(pair.symbol, pair.basePrice)
    })
    
    const interval = 1000 / ordersPerSecond
    
    this.intervalId = window.setInterval(() => {
      this.generateBotOrder()
    }, interval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  private generateBotOrder() {
    const bot = this.bots[Math.floor(Math.random() * this.bots.length)]
    const store = useOrderBookStore.getState()
    const pair = store.pairs[Math.floor(Math.random() * store.pairs.length)]
    
    let basePrice = this.basePrices.get(pair.symbol) || pair.basePrice
    const priceChange = (Math.random() - 0.5) * 2 * this.volatility * basePrice
    basePrice = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, basePrice + priceChange))
    this.basePrices.set(pair.symbol, basePrice)
    
    const side = Math.random() > 0.5 ? 'buy' : 'sell'
    const spread = basePrice * 0.001
    
    const price = side === 'buy' 
      ? basePrice - spread * Math.random()
      : basePrice + spread * Math.random()
    
    const amount = 0.01 + Math.random() * 0.5

    // Randomly choose order type
    const orderTypes: Order['type'][] = ['limit', 'limit', 'limit', 'market']
    const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)]

    const order: Order = {
      id: matchingEngine.generateOrderId(),
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 1000) / 1000,
      side,
      timestamp: Date.now(),
      trader: bot.name,
      type: orderType,
      status: 'open',
      filledAmount: 0,
      pair: pair.symbol,
    }

    matchingEngine.processOrder(order).then(trades => {
      trades.forEach(trade => {
        const isBuyer = trade.buyer === bot.name
        const position = bot.positions.get(pair.symbol) || { amount: 0, avgPrice: 0 }
        
        if (isBuyer) {
          const newAmount = position.amount + trade.amount
          const newAvgPrice = (position.avgPrice * position.amount + trade.price * trade.amount) / newAmount
          bot.positions.set(pair.symbol, { amount: newAmount, avgPrice: newAvgPrice })
        } else {
          const pnlChange = (trade.price - position.avgPrice) * trade.amount
          bot.pnl += pnlChange
          if (pnlChange > 0) bot.wins++
          
          const newAmount = position.amount - trade.amount
          if (newAmount <= 0) {
            bot.positions.delete(pair.symbol)
          } else {
            bot.positions.set(pair.symbol, { ...position, amount: newAmount })
          }
        }
        
        bot.trades++
        
        store.updateLeaderboard({
          trader: bot.name,
          pnl: Math.round(bot.pnl * 100) / 100,
          volume: bot.trades * basePrice * 0.1,
          trades: bot.trades,
          winRate: bot.trades > 0 ? Math.round((bot.wins / bot.trades) * 100) : 0,
        })
      })
    })
  }

  setOrderRate(rate: number) {
    if (this.isRunning) {
      this.stop()
      this.start(rate)
    }
  }

  // Stress test mode - generate burst of orders
  async stressTest(orderCount: number = 10000) {
    const store = useOrderBookStore.getState()
    const startTime = Date.now()
    let processed = 0
    
    const batchSize = 100
    const batches = Math.ceil(orderCount / batchSize)
    
    for (let b = 0; b < batches; b++) {
      const promises: Promise<void>[] = []
      
      for (let i = 0; i < batchSize && processed < orderCount; i++) {
        const bot = this.bots[Math.floor(Math.random() * this.bots.length)]
        const pair = store.pairs[Math.floor(Math.random() * store.pairs.length)]
        const basePrice = pair.basePrice
        
        const side = Math.random() > 0.5 ? 'buy' : 'sell'
        const price = side === 'buy' 
          ? basePrice * (0.995 + Math.random() * 0.01)
          : basePrice * (0.995 + Math.random() * 0.01)
        
        const order: Order = {
          id: matchingEngine.generateOrderId(),
          price: Math.round(price * 100) / 100,
          amount: Math.round((0.01 + Math.random() * 0.1) * 1000) / 1000,
          side,
          timestamp: Date.now(),
          trader: bot.name,
          type: 'limit',
          status: 'open',
          filledAmount: 0,
          pair: pair.symbol,
        }
        
        promises.push(matchingEngine.processOrder(order).then(() => {}))
        processed++
      }
      
      await Promise.all(promises)
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 10))
    }
    
    const duration = Date.now() - startTime
    const actualTps = Math.round(orderCount / (duration / 1000))
    
    return { orderCount, duration, actualTps }
  }
}

export const tradingBots = new TradingBots()
