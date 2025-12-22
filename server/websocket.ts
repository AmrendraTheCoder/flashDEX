import { serve } from 'bun'

interface User {
  id: string
  name: string
  address: string
  pnl: number
  trades: number
  volume: number
  joinedAt: number
}

interface Trade {
  id: string
  trader: string
  pair: string
  side: 'buy' | 'sell'
  price: number
  amount: number
  timestamp: number
}

interface Message {
  type: string
  payload: any
}

// Store connected clients
const clients = new Map<WebSocket, User>()
const trades: Trade[] = []
const leaderboard: User[] = []

function broadcast(message: Message, exclude?: WebSocket) {
  const data = JSON.stringify(message)
  for (const [ws] of clients) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

function updateLeaderboard() {
  const sorted = Array.from(clients.values())
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 20)
  
  broadcast({
    type: 'leaderboard',
    payload: sorted
  })
}

function broadcastStats() {
  broadcast({
    type: 'stats',
    payload: {
      connectedUsers: clients.size,
      totalTrades: trades.length,
      recentTrades: trades.slice(-20)
    }
  })
}

const server = serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
  fetch(req, server) {
    const url = new URL(req.url)
    
    // Handle WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req)
      if (!upgraded) {
        return new Response('WebSocket upgrade failed', { status: 400 })
      }
      return undefined
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        clients: clients.size,
        trades: trades.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }
    
    return new Response('FlashDEX WebSocket Server', { status: 200 })
  },
  websocket: {
    open(ws) {
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const user: User = {
        id: userId,
        name: `Trader ${clients.size + 1}`,
        address: '',
        pnl: 0,
        trades: 0,
        volume: 0,
        joinedAt: Date.now()
      }
      
      clients.set(ws, user)
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        payload: {
          userId,
          connectedUsers: clients.size,
          leaderboard: Array.from(clients.values()).sort((a, b) => b.pnl - a.pnl).slice(0, 20),
          recentTrades: trades.slice(-20)
        }
      }))
      
      // Broadcast user joined
      broadcast({
        type: 'user_joined',
        payload: { connectedUsers: clients.size }
      }, ws)
      
      console.log(`User connected: ${userId} (Total: ${clients.size})`)
    },
    
    message(ws, message) {
      try {
        const data: Message = JSON.parse(message.toString())
        const user = clients.get(ws)
        
        if (!user) return
        
        switch (data.type) {
          case 'identify':
            // User identifies with wallet address
            user.address = data.payload.address
            user.name = data.payload.name || `${data.payload.address.slice(0, 6)}...${data.payload.address.slice(-4)}`
            clients.set(ws, user)
            updateLeaderboard()
            break
            
          case 'trade':
            // User executed a trade
            const trade: Trade = {
              id: `trade-${Date.now()}`,
              trader: user.name,
              pair: data.payload.pair,
              side: data.payload.side,
              price: data.payload.price,
              amount: data.payload.amount,
              timestamp: Date.now()
            }
            
            trades.push(trade)
            if (trades.length > 1000) trades.shift()
            
            // Update user stats
            user.trades++
            user.volume += trade.price * trade.amount
            user.pnl += data.payload.pnl || (Math.random() - 0.5) * 50
            clients.set(ws, user)
            
            // Broadcast trade to all
            broadcast({
              type: 'new_trade',
              payload: trade
            })
            
            updateLeaderboard()
            break
            
          case 'update_pnl':
            user.pnl = data.payload.pnl
            user.trades = data.payload.trades || user.trades
            user.volume = data.payload.volume || user.volume
            clients.set(ws, user)
            updateLeaderboard()
            break
            
          case 'chat':
            broadcast({
              type: 'chat',
              payload: {
                from: user.name,
                message: data.payload.message,
                timestamp: Date.now()
              }
            })
            break
        }
      } catch (e) {
        console.error('Message parse error:', e)
      }
    },
    
    close(ws) {
      const user = clients.get(ws)
      clients.delete(ws)
      
      broadcast({
        type: 'user_left',
        payload: { connectedUsers: clients.size }
      })
      
      console.log(`User disconnected: ${user?.id} (Total: ${clients.size})`)
    },
    
    error(ws, error) {
      console.error('WebSocket error:', error)
    }
  }
})

console.log(`🚀 FlashDEX WebSocket Server running on ws://localhost:${server.port}`)
console.log(`   Health check: http://localhost:${server.port}/health`)