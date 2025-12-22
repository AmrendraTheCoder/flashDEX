const http = require('http')
const { WebSocketServer, WebSocket } = require('ws')

// Store connected clients
const clients = new Map()
const trades = []

function broadcast(message, exclude) {
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
  
  broadcast({ type: 'leaderboard', payload: sorted })
}

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      trades: trades.length
    }))
    return
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('FlashDEX WebSocket Server')
})

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const user = {
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
  broadcast({ type: 'user_joined', payload: { connectedUsers: clients.size } }, ws)
  
  console.log(`User connected: ${userId} (Total: ${clients.size})`)
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())
      const user = clients.get(ws)
      if (!user) return
      
      switch (data.type) {
        case 'identify':
          user.address = data.payload.address
          user.name = data.payload.name || `${data.payload.address.slice(0, 6)}...${data.payload.address.slice(-4)}`
          clients.set(ws, user)
          updateLeaderboard()
          break
          
        case 'trade':
          const trade = {
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
          
          user.trades++
          user.volume += trade.price * trade.amount
          user.pnl += data.payload.pnl || (Math.random() - 0.5) * 50
          clients.set(ws, user)
          
          broadcast({ type: 'new_trade', payload: trade })
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
  })
  
  ws.on('close', () => {
    const user = clients.get(ws)
    clients.delete(ws)
    broadcast({ type: 'user_left', payload: { connectedUsers: clients.size } })
    console.log(`User disconnected: ${user?.id} (Total: ${clients.size})`)
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`FlashDEX WebSocket Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
