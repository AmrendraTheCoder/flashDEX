import { useEffect, useRef, useCallback, useState } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'

interface WebSocketMessage {
  type: string
  payload: any
}

interface LiveTrade {
  id: string
  trader?: string
  pair: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  timestamp: number
}

interface LiveUser {
  id: string
  name: string
  address: string
  pnl: number
  trades: number
  volume: number
}

interface PriceData {
  [pair: string]: number
}

interface OrderBookData {
  [pair: string]: {
    bids: Array<{ price: number; amount: number; total: number }>
    asks: Array<{ price: number; amount: number; total: number }>
  }
}

// WebSocket URL - uses local server in dev, production URL in prod
const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.PROD 
    ? 'wss://flashdex-ws.onrender.com/ws'
    : 'ws://localhost:3001/ws'
)

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [liveLeaderboard, setLiveLeaderboard] = useState<LiveUser[]>([])
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([])
  const [livePrices, setLivePrices] = useState<PriceData>({})
  const [liveOrderBook, setLiveOrderBook] = useState<OrderBookData>({})
  const [userId, setUserId] = useState<string | null>(null)
  
  const { updateLeaderboard, addTrade, currentPair } = useOrderBookStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      console.log('🔌 Connecting to WebSocket:', WS_URL)
      const ws = new WebSocket(WS_URL)
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
      }
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'welcome':
              setUserId(message.payload.userId)
              setConnectedUsers(message.payload.connectedUsers)
              setLiveLeaderboard(message.payload.leaderboard || [])
              setLiveTrades(message.payload.recentTrades || [])
              if (message.payload.prices) {
                setLivePrices(message.payload.prices)
              }
              if (message.payload.orderBook) {
                setLiveOrderBook(message.payload.orderBook)
              }
              break
              
            case 'user_joined':
            case 'user_left':
              setConnectedUsers(message.payload.connectedUsers)
              break
              
            case 'leaderboard':
              setLiveLeaderboard(message.payload)
              message.payload.forEach((user: LiveUser) => {
                updateLeaderboard({
                  trader: user.name,
                  pnl: user.pnl,
                  volume: user.volume,
                  trades: user.trades,
                  winRate: Math.round(50 + Math.random() * 30)
                })
              })
              break
              
            case 'new_trade':
              const trade = message.payload
              setLiveTrades(prev => [trade, ...prev].slice(0, 50))
              // Add to store if it matches current pair
              if (trade.pair === currentPair.symbol) {
                addTrade(currentPair.symbol, {
                  id: trade.id,
                  price: trade.price,
                  amount: trade.amount,
                  side: trade.side,
                  timestamp: trade.timestamp,
                })
              }
              break
              
            case 'price_update':
              setLivePrices(message.payload.prices)
              break
              
            case 'orderbook_update':
              setLiveOrderBook(message.payload)
              break
              
            case 'orderbook_snapshot':
              setLiveOrderBook(prev => ({
                ...prev,
                [currentPair.symbol]: message.payload,
              }))
              break
              
            case 'trades_snapshot':
              setLiveTrades(message.payload)
              break
              
            case 'onchain_update':
              // On-chain data update - can be used for hybrid mode
              console.log('📦 On-chain data received')
              break
              
            case 'order_result':
              console.log('📝 Order result:', message.payload)
              break
              
            case 'stats':
              setConnectedUsers(message.payload.connectedUsers)
              break
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }
      
      ws.onclose = () => {
        console.log('❌ WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting to reconnect...')
          connect()
        }, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      wsRef.current = ws
    } catch (e) {
      console.error('WebSocket connection error:', e)
      setConnectedUsers(Math.floor(Math.random() * 10) + 1)
    }
  }, [updateLeaderboard, addTrade, currentPair.symbol])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const identify = useCallback((address: string, name?: string) => {
    send('identify', { address, name })
  }, [send])

  const broadcastTrade = useCallback((trade: {
    pair: string
    side: 'buy' | 'sell'
    price: number
    amount: number
    pnl?: number
  }) => {
    send('trade', trade)
  }, [send])

  const placeOrder = useCallback((order: {
    pair: string
    side: 'buy' | 'sell'
    price: number
    amount: number
  }) => {
    send('place_order', order)
  }, [send])

  const updatePnl = useCallback((pnl: number, trades: number, volume: number) => {
    send('update_pnl', { pnl, trades, volume })
  }, [send])

  const subscribe = useCallback((channels: string[]) => {
    send('subscribe', { channels })
  }, [send])

  const getOrderBook = useCallback((pair: string) => {
    send('get_orderbook', { pair })
  }, [send])

  const getTrades = useCallback(() => {
    send('get_trades', {})
  }, [send])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // Simulate users if WebSocket fails
  useEffect(() => {
    if (!isConnected) {
      const interval = setInterval(() => {
        setConnectedUsers(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1))
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [isConnected])

  return {
    isConnected,
    connectedUsers,
    liveLeaderboard,
    liveTrades,
    livePrices,
    liveOrderBook,
    userId,
    identify,
    broadcastTrade,
    placeOrder,
    updatePnl,
    subscribe,
    getOrderBook,
    getTrades,
    send,
  }
}
