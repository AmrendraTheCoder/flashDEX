import { useEffect, useRef, useCallback, useState } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'

interface WebSocketMessage {
  type: string
  payload: any
}

interface LiveTrade {
  id: string
  trader: string
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

// Set your Render WebSocket URL here after deployment
const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.PROD 
    ? 'wss://flashdex-ws.onrender.com/ws'  // Update this after Render deployment
    : 'ws://localhost:3001/ws'
)

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [liveLeaderboard, setLiveLeaderboard] = useState<LiveUser[]>([])
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  
  const { updateLeaderboard } = useOrderBookStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    try {
      console.log('Connecting to WebSocket:', WS_URL)
      const ws = new WebSocket(WS_URL)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
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
              setLiveTrades(prev => [message.payload, ...prev].slice(0, 50))
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
        console.log('WebSocket disconnected')
        setIsConnected(false)
        wsRef.current = null
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      wsRef.current = ws
    } catch (e) {
      console.error('WebSocket connection error:', e)
      // Fallback to simulation mode
      setConnectedUsers(Math.floor(Math.random() * 10) + 1)
    }
  }, [updateLeaderboard])

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

  const updatePnl = useCallback((pnl: number, trades: number, volume: number) => {
    send('update_pnl', { pnl, trades, volume })
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
    userId,
    identify,
    broadcastTrade,
    updatePnl,
    send
  }
}