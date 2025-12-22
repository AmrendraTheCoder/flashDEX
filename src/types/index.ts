export interface Order {
  id: string
  price: number
  amount: number
  side: 'buy' | 'sell'
  timestamp: number
  trader: string
  type: 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'trailing-stop' | 'oco'
  stopPrice?: number
  trailingPercent?: number
  status: 'open' | 'filled' | 'partial' | 'cancelled'
  filledAmount: number
  pair: string
}

export interface Trade {
  id: string
  price: number
  amount: number
  side: 'buy' | 'sell'
  timestamp: number
  buyer: string
  seller: string
  pair: string
}

export interface PnLEntry {
  trader: string
  pnl: number
  volume: number
  trades: number
  winRate: number
}

export interface Position {
  pair: string
  side: 'buy' | 'sell'
  entryPrice: number
  amount: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  timestamp?: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradingPair {
  symbol: string
  base: string
  quote: string
  basePrice: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
}

export interface DepthLevel {
  price: number
  amount: number
  total: number
}

export interface UserPortfolio {
  address: string
  balance: number
  positions: Position[]
  openOrders: Order[]
  tradeHistory: Trade[]
  totalPnl: number
  totalVolume: number
  totalTrades: number
}

export interface Analytics {
  volumeHistory: { time: number; volume: number }[]
  tradeCount: number
  avgTradeSize: number
  volatility: number
  topTraders: PnLEntry[]
}
