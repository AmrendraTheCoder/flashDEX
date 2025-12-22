import { create } from 'zustand'
import type { Order, Trade, PnLEntry, Candle, TradingPair, Position, UserPortfolio, Analytics } from '../types'
import { generateInitialBids, generateInitialAsks, generateInitialTrades, generateInitialLeaderboard } from '../utils/sampleData'

export type { Order, Trade, PnLEntry }

const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', basePrice: 3500, change24h: 2.4, volume24h: 125840, high24h: 3600, low24h: 3400 },
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', basePrice: 95000, change24h: 1.2, volume24h: 892450, high24h: 96000, low24h: 94000 },
  { symbol: 'MON/USDT', base: 'MON', quote: 'USDT', basePrice: 2.5, change24h: 5.8, volume24h: 45230, high24h: 2.7, low24h: 2.3 },
]

// Pre-generate initial data for all pairs
const initialBids = new Map(TRADING_PAIRS.map(p => [p.symbol, generateInitialBids(p.basePrice, p.symbol)]))
const initialAsks = new Map(TRADING_PAIRS.map(p => [p.symbol, generateInitialAsks(p.basePrice, p.symbol)]))
const initialTrades = new Map(TRADING_PAIRS.map(p => [p.symbol, generateInitialTrades(p.basePrice, p.symbol)]))
const initialLeaderboard = generateInitialLeaderboard()

interface OrderBookState {
  // Current pair
  currentPair: TradingPair
  pairs: TradingPair[]
  
  // Order book per pair
  bids: Map<string, Order[]>
  asks: Map<string, Order[]>
  trades: Map<string, Trade[]>
  candles: Map<string, Candle[]>
  
  // Global stats
  leaderboard: PnLEntry[]
  tps: number
  totalVolume: number
  totalOrders: number
  latency: number
  
  // User data
  userPortfolio: UserPortfolio | null
  
  // Analytics
  analytics: Analytics
  
  // Actions
  setCurrentPair: (symbol: string) => void
  addOrder: (order: Order) => void
  updateOrder: (id: string, updates: Partial<Order>) => void
  removeOrder: (id: string) => void
  addTrade: (trade: Trade) => void
  addCandle: (pair: string, candle: Candle) => void
  updateTps: (tps: number) => void
  updateLatency: (latency: number) => void
  updateLeaderboard: (entry: PnLEntry) => void
  updatePairPrice: (symbol: string, price: number) => void
  setUserPortfolio: (portfolio: UserPortfolio | null) => void
  addUserOrder: (order: Order) => void
  addUserTrade: (trade: Trade) => void
  updateUserPosition: (position: Position) => void
  clearOrders: () => void
  
  // Getters
  getCurrentBids: () => Order[]
  getCurrentAsks: () => Order[]
  getCurrentTrades: () => Trade[]
  getCurrentCandles: () => Candle[]
  getCurrentPrice: () => number
}

export const useOrderBookStore = create<OrderBookState>((set, get) => ({
  currentPair: TRADING_PAIRS[0],
  pairs: TRADING_PAIRS,
  bids: initialBids,
  asks: initialAsks,
  trades: initialTrades,
  candles: new Map(TRADING_PAIRS.map(p => [p.symbol, []])),
  leaderboard: initialLeaderboard,
  tps: 0,
  totalVolume: 125840 + 892450 + 45230, // Sum of initial volumes
  totalOrders: 72, // 12 bids + 12 asks per 3 pairs
  latency: 0,
  userPortfolio: null,
  analytics: {
    volumeHistory: Array.from({ length: 20 }, (_, i) => ({ 
      time: Date.now() - (19 - i) * 60000, 
      volume: 5000 + Math.random() * 10000 
    })),
    tradeCount: 45,
    avgTradeSize: 0.15,
    volatility: 2.4,
    topTraders: initialLeaderboard.slice(0, 5),
  },

  setCurrentPair: (symbol) => set((state) => ({
    currentPair: state.pairs.find(p => p.symbol === symbol) || state.pairs[0]
  })),

  addOrder: (order) => set((state) => {
    const pair = order.pair
    const mapKey = order.side === 'buy' ? 'bids' : 'asks'
    const currentOrders = state[mapKey].get(pair) || []
    const newOrders = [...currentOrders, order]
      .sort((a, b) => order.side === 'buy' ? b.price - a.price : a.price - b.price)
      .slice(0, 50)
    
    const newMap = new Map(state[mapKey])
    newMap.set(pair, newOrders)
    
    return { 
      [mapKey]: newMap,
      totalOrders: state.totalOrders + 1 
    }
  }),

  updateOrder: (id, updates) => set((state) => {
    const newBids = new Map(state.bids)
    const newAsks = new Map(state.asks)
    
    for (const [pair, orders] of newBids) {
      const idx = orders.findIndex(o => o.id === id)
      if (idx >= 0) {
        const newOrders = [...orders]
        newOrders[idx] = { ...newOrders[idx], ...updates }
        newBids.set(pair, newOrders)
        return { bids: newBids }
      }
    }
    
    for (const [pair, orders] of newAsks) {
      const idx = orders.findIndex(o => o.id === id)
      if (idx >= 0) {
        const newOrders = [...orders]
        newOrders[idx] = { ...newOrders[idx], ...updates }
        newAsks.set(pair, newOrders)
        return { asks: newAsks }
      }
    }
    
    return {}
  }),

  removeOrder: (id) => set((state) => {
    const newBids = new Map(state.bids)
    const newAsks = new Map(state.asks)
    
    for (const [pair, orders] of newBids) {
      newBids.set(pair, orders.filter(o => o.id !== id))
    }
    for (const [pair, orders] of newAsks) {
      newAsks.set(pair, orders.filter(o => o.id !== id))
    }
    
    return { bids: newBids, asks: newAsks }
  }),

  addTrade: (trade) => set((state) => {
    const pair = trade.pair
    const currentTrades = state.trades.get(pair) || []
    const newTrades = [trade, ...currentTrades].slice(0, 100)
    
    const newTradesMap = new Map(state.trades)
    newTradesMap.set(pair, newTrades)
    
    // Update pair price
    const newPairs = state.pairs.map(p => 
      p.symbol === pair 
        ? { ...p, basePrice: trade.price, volume24h: p.volume24h + trade.price * trade.amount }
        : p
    )
    
    // Update analytics
    const newVolumeHistory = [...state.analytics.volumeHistory, { time: trade.timestamp, volume: trade.price * trade.amount }].slice(-100)
    
    return {
      trades: newTradesMap,
      pairs: newPairs,
      currentPair: newPairs.find(p => p.symbol === state.currentPair.symbol) || state.currentPair,
      totalVolume: state.totalVolume + trade.price * trade.amount,
      analytics: {
        ...state.analytics,
        volumeHistory: newVolumeHistory,
        tradeCount: state.analytics.tradeCount + 1,
        avgTradeSize: (state.analytics.avgTradeSize * state.analytics.tradeCount + trade.amount) / (state.analytics.tradeCount + 1),
      }
    }
  }),

  addCandle: (pair, candle) => set((state) => {
    const currentCandles = state.candles.get(pair) || []
    const lastCandle = currentCandles[currentCandles.length - 1]
    
    let newCandles: Candle[]
    if (lastCandle && lastCandle.time === candle.time) {
      // Update existing candle
      newCandles = [...currentCandles.slice(0, -1), {
        ...lastCandle,
        high: Math.max(lastCandle.high, candle.close),
        low: Math.min(lastCandle.low, candle.close),
        close: candle.close,
        volume: lastCandle.volume + candle.volume,
      }]
    } else {
      newCandles = [...currentCandles, candle].slice(-500)
    }
    
    const newCandlesMap = new Map(state.candles)
    newCandlesMap.set(pair, newCandles)
    
    return { candles: newCandlesMap }
  }),

  updateTps: (tps) => set({ tps }),
  updateLatency: (latency) => set({ latency }),
  
  updateLeaderboard: (entry) => set((state) => {
    const existing = state.leaderboard.findIndex(e => e.trader === entry.trader)
    const newLeaderboard = [...state.leaderboard]
    if (existing >= 0) {
      newLeaderboard[existing] = entry
    } else {
      newLeaderboard.push(entry)
    }
    return { 
      leaderboard: newLeaderboard.sort((a, b) => b.pnl - a.pnl).slice(0, 20),
      analytics: { ...state.analytics, topTraders: newLeaderboard.slice(0, 10) }
    }
  }),

  updatePairPrice: (symbol, price) => set((state) => {
    const newPairs = state.pairs.map(p => 
      p.symbol === symbol ? { ...p, basePrice: price } : p
    )
    return {
      pairs: newPairs,
      currentPair: state.currentPair.symbol === symbol 
        ? { ...state.currentPair, basePrice: price }
        : state.currentPair
    }
  }),

  setUserPortfolio: (portfolio) => set({ userPortfolio: portfolio }),

  addUserOrder: (order) => set((state) => {
    if (!state.userPortfolio) return {}
    return {
      userPortfolio: {
        ...state.userPortfolio,
        openOrders: [...state.userPortfolio.openOrders, order]
      }
    }
  }),

  addUserTrade: (trade) => set((state) => {
    if (!state.userPortfolio) return {}
    return {
      userPortfolio: {
        ...state.userPortfolio,
        tradeHistory: [trade, ...state.userPortfolio.tradeHistory].slice(0, 100),
        totalTrades: state.userPortfolio.totalTrades + 1,
        totalVolume: state.userPortfolio.totalVolume + trade.price * trade.amount
      }
    }
  }),

  updateUserPosition: (position) => set((state) => {
    if (!state.userPortfolio) return {}
    const existingIdx = state.userPortfolio.positions.findIndex(p => p.pair === position.pair)
    const newPositions = [...state.userPortfolio.positions]
    
    if (existingIdx >= 0) {
      if (position.amount === 0) {
        newPositions.splice(existingIdx, 1)
      } else {
        newPositions[existingIdx] = position
      }
    } else if (position.amount > 0) {
      newPositions.push(position)
    }
    
    const totalPnl = newPositions.reduce((sum, p) => sum + p.pnl, 0)
    
    return {
      userPortfolio: {
        ...state.userPortfolio,
        positions: newPositions,
        totalPnl
      }
    }
  }),

  clearOrders: () => set((state) => ({
    bids: new Map(state.pairs.map(p => [p.symbol, []])),
    asks: new Map(state.pairs.map(p => [p.symbol, []])),
    trades: new Map(state.pairs.map(p => [p.symbol, []])),
  })),

  getCurrentBids: () => {
    const state = get()
    return state.bids.get(state.currentPair.symbol) || []
  },

  getCurrentAsks: () => {
    const state = get()
    return state.asks.get(state.currentPair.symbol) || []
  },

  getCurrentTrades: () => {
    const state = get()
    return state.trades.get(state.currentPair.symbol) || []
  },

  getCurrentCandles: () => {
    const state = get()
    return state.candles.get(state.currentPair.symbol) || []
  },

  getCurrentPrice: () => {
    const state = get()
    return state.currentPair.basePrice
  },
}))
