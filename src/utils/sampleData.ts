import type { Order, Trade, PnLEntry } from '../types'

/**
 * Generate realistic sample data for the order book, trades, and leaderboard
 * This ensures the UI is populated on first load before simulation starts
 */

const BOT_NAMES = [
  'AlphaBot', 'BetaTrader', 'GammaHFT', 'DeltaMaker', 'EpsilonArb',
  'ZetaQuant', 'EtaFlow', 'ThetaSniper', 'IotaScalper', 'KappaWhale'
]

function randomId(): string {
  return `init-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function randomTrader(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}

/**
 * Generate initial bid orders around a base price
 */
export function generateInitialBids(basePrice: number, pair: string, count: number = 12): Order[] {
  const orders: Order[] = []
  const spread = basePrice * 0.001 // 0.1% spread
  
  for (let i = 0; i < count; i++) {
    const priceOffset = spread * (i + 1) * (0.8 + Math.random() * 0.4)
    const price = basePrice - priceOffset
    const amount = 0.05 + Math.random() * 0.5
    
    orders.push({
      id: randomId(),
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 10000) / 10000,
      side: 'buy',
      timestamp: Date.now() - Math.random() * 60000,
      trader: randomTrader(),
      type: 'limit',
      status: 'open',
      filledAmount: 0,
      pair,
    })
  }
  
  return orders.sort((a, b) => b.price - a.price)
}

/**
 * Generate initial ask orders around a base price
 */
export function generateInitialAsks(basePrice: number, pair: string, count: number = 12): Order[] {
  const orders: Order[] = []
  const spread = basePrice * 0.001
  
  for (let i = 0; i < count; i++) {
    const priceOffset = spread * (i + 1) * (0.8 + Math.random() * 0.4)
    const price = basePrice + priceOffset
    const amount = 0.05 + Math.random() * 0.5
    
    orders.push({
      id: randomId(),
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 10000) / 10000,
      side: 'sell',
      timestamp: Date.now() - Math.random() * 60000,
      trader: randomTrader(),
      type: 'limit',
      status: 'open',
      filledAmount: 0,
      pair,
    })
  }
  
  return orders.sort((a, b) => a.price - b.price)
}

/**
 * Generate initial recent trades
 */
export function generateInitialTrades(basePrice: number, pair: string, count: number = 15): Trade[] {
  const trades: Trade[] = []
  const now = Date.now()
  
  for (let i = 0; i < count; i++) {
    const priceVariation = basePrice * (0.998 + Math.random() * 0.004)
    const side = Math.random() > 0.5 ? 'buy' : 'sell'
    const amount = 0.01 + Math.random() * 0.3
    
    trades.push({
      id: randomId(),
      price: Math.round(priceVariation * 100) / 100,
      amount: Math.round(amount * 10000) / 10000,
      side,
      timestamp: now - (i * 5000) - Math.random() * 2000,
      buyer: randomTrader(),
      seller: randomTrader(),
      pair,
    })
  }
  
  return trades.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Generate initial leaderboard entries
 */
export function generateInitialLeaderboard(): PnLEntry[] {
  return BOT_NAMES.slice(0, 8).map((name, i) => ({
    trader: name,
    pnl: Math.round((500 - i * 80 + (Math.random() - 0.5) * 100) * 100) / 100,
    volume: Math.round((50000 - i * 5000 + Math.random() * 10000) * 100) / 100,
    trades: Math.floor(50 - i * 5 + Math.random() * 20),
    winRate: Math.round(65 - i * 3 + (Math.random() - 0.5) * 10),
  })).sort((a, b) => b.pnl - a.pnl)
}

/**
 * Generate all initial data for a trading pair
 */
export function generateInitialDataForPair(basePrice: number, pair: string) {
  return {
    bids: generateInitialBids(basePrice, pair),
    asks: generateInitialAsks(basePrice, pair),
    trades: generateInitialTrades(basePrice, pair),
  }
}
