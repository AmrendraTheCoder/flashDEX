import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createPublicClient, createWalletClient, http as viemHttp, parseUnits, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import 'dotenv/config'

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3001

// Monad Testnet
const MONAD_RPC = 'https://testnet-rpc.monad.xyz'
const CHAIN_ID = 10143

// Contract Addresses
const CONTRACTS = {
  FETH: '0x35895ffaBB85255232c3575137591277Fb1BC433',
  FUSDT: '0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081',
  FBTC: '0xCEa63bF96B1F830bA950d478265e1bdde12063A9',
  ORACLE: '0xE7CFE8395735140A22a40430E6922334dCB37c55',
  ORDERBOOK: '0x6BD87ee70b9333474333680c846AFD2Ca65BC33c',
}

// ABIs (minimal)
const ORACLE_ABI = [
  { name: 'getPrice', type: 'function', inputs: [{ name: 'pair', type: 'string' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'setPrice', type: 'function', inputs: [{ name: 'pair', type: 'string' }, { name: 'price', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
]

const ORDERBOOK_ABI = [
  { name: 'getOrderBook', type: 'function', inputs: [{ name: 'depth', type: 'uint256' }], outputs: [{ type: 'uint256[]' }, { type: 'uint256[]' }, { type: 'uint256[]' }, { type: 'uint256[]' }], stateMutability: 'view' },
  { name: 'getRecentTrades', type: 'function', inputs: [{ name: 'count', type: 'uint256' }], outputs: [{ type: 'tuple[]', components: [{ name: 'id', type: 'uint256' }, { name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'buyOrderId', type: 'uint256' }, { name: 'sellOrderId', type: 'uint256' }] }], stateMutability: 'view' },
  { name: 'getStats', type: 'function', inputs: [], outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view' },
  { name: 'placeOrder', type: 'function', inputs: [{ name: 'price', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'isBuy', type: 'bool' }, { name: 'orderType', type: 'uint8' }, { name: 'stopPrice', type: 'uint256' }, { name: 'expiry', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'nonpayable' },
]

// ============================================
// BLOCKCHAIN CLIENT
// ============================================

const publicClient = createPublicClient({
  transport: viemHttp(MONAD_RPC),
})

let walletClient = null
let botAccount = null

if (process.env.PRIVATE_KEY) {
  botAccount = privateKeyToAccount(process.env.PRIVATE_KEY)
  walletClient = createWalletClient({
    account: botAccount,
    transport: viemHttp(MONAD_RPC),
  })
  console.log('🤖 Bot wallet loaded:', botAccount.address)
}

// ============================================
// STATE
// ============================================

const clients = new Map()
const orderBook = { bids: [], asks: [] }
const trades = []
const prices = {
  'FETH/FUSDT': 2500,
  'FBTC/FUSDT': 45000,
}

// Simulated order book for Fast mode
let simulatedOrderBook = {
  'FETH/FUSDT': { bids: [], asks: [] },
  'FBTC/FUSDT': { bids: [], asks: [] },
}

// ============================================
// PRICE FEED SERVICE
// ============================================

class PriceFeedService {
  constructor() {
    this.prices = { ...prices }
    this.volatility = 0.001 // 0.1% per tick
    this.interval = null
  }

  start() {
    console.log('📈 Starting price feed service...')
    this.interval = setInterval(() => this.updatePrices(), 1000)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
  }

  updatePrices() {
    for (const pair of Object.keys(this.prices)) {
      // Random walk with mean reversion
      const change = (Math.random() - 0.5) * 2 * this.volatility
      const meanReversion = (prices[pair] - this.prices[pair]) / prices[pair] * 0.01
      this.prices[pair] = this.prices[pair] * (1 + change + meanReversion)
      this.prices[pair] = Math.max(this.prices[pair], prices[pair] * 0.9)
      this.prices[pair] = Math.min(this.prices[pair], prices[pair] * 1.1)
    }

    // Broadcast price updates
    broadcast({
      type: 'price_update',
      payload: {
        prices: this.prices,
        timestamp: Date.now(),
      }
    })
  }

  getPrice(pair) {
    return this.prices[pair] || 0
  }
}

const priceFeed = new PriceFeedService()

// ============================================
// ORDER BOOK SERVICE
// ============================================

class OrderBookService {
  constructor() {
    this.books = {
      'FETH/FUSDT': { bids: [], asks: [] },
      'FBTC/FUSDT': { bids: [], asks: [] },
    }
    this.orderIdCounter = 1
    this.interval = null
  }

  start() {
    console.log('📚 Starting order book service...')
    this.generateInitialOrders()
    this.interval = setInterval(() => this.simulateActivity(), 500)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
  }

  generateInitialOrders() {
    for (const pair of Object.keys(this.books)) {
      const basePrice = priceFeed.getPrice(pair)
      
      // Generate bids (buy orders below current price)
      for (let i = 0; i < 15; i++) {
        const price = basePrice * (1 - 0.001 * (i + 1) - Math.random() * 0.002)
        const amount = 0.1 + Math.random() * 2
        this.books[pair].bids.push({
          id: this.orderIdCounter++,
          price: Math.round(price * 100) / 100,
          amount: Math.round(amount * 10000) / 10000,
          total: 0,
          side: 'buy',
        })
      }

      // Generate asks (sell orders above current price)
      for (let i = 0; i < 15; i++) {
        const price = basePrice * (1 + 0.001 * (i + 1) + Math.random() * 0.002)
        const amount = 0.1 + Math.random() * 2
        this.books[pair].asks.push({
          id: this.orderIdCounter++,
          price: Math.round(price * 100) / 100,
          amount: Math.round(amount * 10000) / 10000,
          total: 0,
          side: 'sell',
        })
      }

      // Sort
      this.books[pair].bids.sort((a, b) => b.price - a.price)
      this.books[pair].asks.sort((a, b) => a.price - b.price)
      
      // Calculate totals
      this.calculateTotals(pair)
    }
  }

  calculateTotals(pair) {
    let bidTotal = 0
    for (const bid of this.books[pair].bids) {
      bidTotal += bid.amount
      bid.total = Math.round(bidTotal * 10000) / 10000
    }

    let askTotal = 0
    for (const ask of this.books[pair].asks) {
      askTotal += ask.amount
      ask.total = Math.round(askTotal * 10000) / 10000
    }
  }

  simulateActivity() {
    for (const pair of Object.keys(this.books)) {
      const basePrice = priceFeed.getPrice(pair)
      
      // Randomly add/remove orders
      if (Math.random() < 0.3) {
        const isBuy = Math.random() < 0.5
        const spread = isBuy ? -1 : 1
        const price = basePrice * (1 + spread * (0.001 + Math.random() * 0.005))
        const amount = 0.05 + Math.random() * 0.5

        const order = {
          id: this.orderIdCounter++,
          price: Math.round(price * 100) / 100,
          amount: Math.round(amount * 10000) / 10000,
          total: 0,
          side: isBuy ? 'buy' : 'sell',
        }

        if (isBuy) {
          this.books[pair].bids.push(order)
          this.books[pair].bids.sort((a, b) => b.price - a.price)
          if (this.books[pair].bids.length > 20) this.books[pair].bids.pop()
        } else {
          this.books[pair].asks.push(order)
          this.books[pair].asks.sort((a, b) => a.price - b.price)
          if (this.books[pair].asks.length > 20) this.books[pair].asks.pop()
        }

        this.calculateTotals(pair)
      }

      // Simulate trade execution
      if (Math.random() < 0.2) {
        this.simulateTrade(pair)
      }
    }

    // Broadcast order book updates
    broadcast({
      type: 'orderbook_update',
      payload: this.books,
    })
  }

  simulateTrade(pair) {
    const book = this.books[pair]
    if (book.bids.length === 0 || book.asks.length === 0) return

    const isBuyerTaker = Math.random() < 0.5
    let price, amount

    if (isBuyerTaker && book.asks.length > 0) {
      // Buyer takes from asks
      const ask = book.asks[0]
      price = ask.price
      amount = Math.min(ask.amount, 0.01 + Math.random() * 0.1)
      ask.amount -= amount
      if (ask.amount <= 0.0001) book.asks.shift()
    } else if (book.bids.length > 0) {
      // Seller takes from bids
      const bid = book.bids[0]
      price = bid.price
      amount = Math.min(bid.amount, 0.01 + Math.random() * 0.1)
      bid.amount -= amount
      if (bid.amount <= 0.0001) book.bids.shift()
    } else {
      return
    }

    const trade = {
      id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pair,
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 10000) / 10000,
      side: isBuyerTaker ? 'buy' : 'sell',
      timestamp: Date.now(),
    }

    trades.unshift(trade)
    if (trades.length > 100) trades.pop()

    this.calculateTotals(pair)

    // Broadcast trade
    broadcast({
      type: 'new_trade',
      payload: trade,
    })
  }

  getOrderBook(pair) {
    return this.books[pair] || { bids: [], asks: [] }
  }

  placeOrder(pair, side, price, amount, userId) {
    const order = {
      id: this.orderIdCounter++,
      price: Math.round(price * 100) / 100,
      amount: Math.round(amount * 10000) / 10000,
      total: 0,
      side,
      userId,
      timestamp: Date.now(),
    }

    // Try to match
    const matched = this.matchOrder(pair, order)
    
    if (!matched.fullyFilled) {
      // Add remaining to book
      if (side === 'buy') {
        this.books[pair].bids.push(order)
        this.books[pair].bids.sort((a, b) => b.price - a.price)
      } else {
        this.books[pair].asks.push(order)
        this.books[pair].asks.sort((a, b) => a.price - b.price)
      }
      this.calculateTotals(pair)
    }

    return { order, matched }
  }

  matchOrder(pair, order) {
    const book = this.books[pair]
    const fills = []
    let remainingAmount = order.amount

    if (order.side === 'buy') {
      // Match against asks
      while (remainingAmount > 0 && book.asks.length > 0) {
        const ask = book.asks[0]
        if (ask.price > order.price) break

        const fillAmount = Math.min(remainingAmount, ask.amount)
        fills.push({
          price: ask.price,
          amount: fillAmount,
          side: 'buy',
        })

        remainingAmount -= fillAmount
        ask.amount -= fillAmount

        if (ask.amount <= 0.0001) book.asks.shift()

        // Create trade
        const trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pair,
          price: ask.price,
          amount: fillAmount,
          side: 'buy',
          timestamp: Date.now(),
        }
        trades.unshift(trade)
        broadcast({ type: 'new_trade', payload: trade })
      }
    } else {
      // Match against bids
      while (remainingAmount > 0 && book.bids.length > 0) {
        const bid = book.bids[0]
        if (bid.price < order.price) break

        const fillAmount = Math.min(remainingAmount, bid.amount)
        fills.push({
          price: bid.price,
          amount: fillAmount,
          side: 'sell',
        })

        remainingAmount -= fillAmount
        bid.amount -= fillAmount

        if (bid.amount <= 0.0001) book.bids.shift()

        // Create trade
        const trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pair,
          price: bid.price,
          amount: fillAmount,
          side: 'sell',
          timestamp: Date.now(),
        }
        trades.unshift(trade)
        broadcast({ type: 'new_trade', payload: trade })
      }
    }

    order.amount = remainingAmount
    this.calculateTotals(pair)

    return {
      fills,
      fullyFilled: remainingAmount <= 0.0001,
      remainingAmount,
    }
  }
}

const orderBookService = new OrderBookService()

// ============================================
// ON-CHAIN DATA FETCHER
// ============================================

class OnChainService {
  constructor() {
    this.interval = null
    this.lastData = {
      orderBook: { bids: [], asks: [] },
      trades: [],
      stats: {},
    }
  }

  async start() {
    console.log('⛓️ Starting on-chain data service...')
    await this.fetchData()
    this.interval = setInterval(() => this.fetchData(), 5000)
  }

  stop() {
    if (this.interval) clearInterval(this.interval)
  }

  async fetchData() {
    try {
      // Fetch order book
      const [bidPrices, bidAmounts, askPrices, askAmounts] = await publicClient.readContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'getOrderBook',
        args: [20n],
      })

      const bids = bidPrices.map((price, i) => ({
        price: Number(formatUnits(price, 6)),
        amount: Number(formatUnits(bidAmounts[i], 18)),
      })).filter(b => b.price > 0)

      const asks = askPrices.map((price, i) => ({
        price: Number(formatUnits(price, 6)),
        amount: Number(formatUnits(askAmounts[i], 18)),
      })).filter(a => a.price > 0)

      // Fetch recent trades
      const rawTrades = await publicClient.readContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'getRecentTrades',
        args: [20n],
      })

      const onChainTrades = rawTrades.map(t => ({
        id: Number(t.id),
        price: Number(formatUnits(t.price, 6)),
        amount: Number(formatUnits(t.amount, 18)),
        timestamp: Number(t.timestamp) * 1000,
        side: Number(t.buyOrderId) > Number(t.sellOrderId) ? 'buy' : 'sell',
      })).filter(t => t.id > 0)

      // Fetch stats
      const [totalVolume, totalTrades, lastPrice, buyLevels, sellLevels] = await publicClient.readContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'getStats',
      })

      this.lastData = {
        orderBook: { bids, asks },
        trades: onChainTrades,
        stats: {
          totalVolume: Number(formatUnits(totalVolume, 18)),
          totalTrades: Number(totalTrades),
          lastPrice: Number(formatUnits(lastPrice, 6)),
          buyLevels: Number(buyLevels),
          sellLevels: Number(sellLevels),
        },
      }

      // Broadcast on-chain data
      broadcast({
        type: 'onchain_update',
        payload: this.lastData,
      })

    } catch (error) {
      console.error('On-chain fetch error:', error.message)
    }
  }

  getData() {
    return this.lastData
  }
}

const onChainService = new OnChainService()

// ============================================
// MARKET MAKER BOT
// ============================================

class MarketMakerBot {
  constructor() {
    this.enabled = false
    this.interval = null
    this.spread = 0.002 // 0.2% spread
    this.orderSize = 0.1
  }

  start() {
    if (!walletClient) {
      console.log('⚠️ Market maker bot disabled (no private key)')
      return
    }
    
    console.log('🤖 Starting market maker bot...')
    this.enabled = true
    this.interval = setInterval(() => this.tick(), 10000)
  }

  stop() {
    this.enabled = false
    if (this.interval) clearInterval(this.interval)
  }

  async tick() {
    if (!this.enabled || !walletClient) return

    try {
      const price = priceFeed.getPrice('FETH/FUSDT')
      const bidPrice = price * (1 - this.spread)
      const askPrice = price * (1 + this.spread)

      // Place bid
      await this.placeOnChainOrder(bidPrice, this.orderSize, true)
      
      // Place ask
      await this.placeOnChainOrder(askPrice, this.orderSize, false)

      console.log(`🤖 MM: Bid $${bidPrice.toFixed(2)} | Ask $${askPrice.toFixed(2)}`)
    } catch (error) {
      console.error('Market maker error:', error.message)
    }
  }

  async placeOnChainOrder(price, amount, isBuy) {
    if (!walletClient) return

    try {
      const priceWei = parseUnits(price.toFixed(6), 6)
      const amountWei = parseUnits(amount.toFixed(18), 18)

      const hash = await walletClient.writeContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'placeOrder',
        args: [priceWei, amountWei, isBuy, 0, 0n, 0n],
        chain: { id: CHAIN_ID },
      })

      console.log(`🤖 Order placed: ${hash}`)
      return hash
    } catch (error) {
      console.error('Place order error:', error.message)
    }
  }
}

const marketMaker = new MarketMakerBot()

// ============================================
// WEBSOCKET SERVER
// ============================================

function broadcast(message, exclude) {
  const data = JSON.stringify(message)
  for (const [ws] of clients) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      clients: clients.size,
      trades: trades.length,
      prices: priceFeed.prices,
      uptime: process.uptime(),
    }))
    return
  }

  // API: Get prices
  if (url.pathname === '/api/prices') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(priceFeed.prices))
    return
  }

  // API: Get order book
  if (url.pathname === '/api/orderbook') {
    const pair = url.searchParams.get('pair') || 'FETH/FUSDT'
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(orderBookService.getOrderBook(pair)))
    return
  }

  // API: Get trades
  if (url.pathname === '/api/trades') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(trades.slice(0, 50)))
    return
  }

  // API: Get on-chain data
  if (url.pathname === '/api/onchain') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(onChainService.getData()))
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('FlashDEX Backend Server v1.0')
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
    joinedAt: Date.now(),
  }

  clients.set(ws, user)

  // Send welcome message with current state
  ws.send(JSON.stringify({
    type: 'welcome',
    payload: {
      userId,
      connectedUsers: clients.size,
      prices: priceFeed.prices,
      orderBook: orderBookService.books,
      recentTrades: trades.slice(0, 20),
      onChainData: onChainService.getData(),
    }
  }))

  broadcast({ type: 'user_joined', payload: { connectedUsers: clients.size } }, ws)
  console.log(`✅ User connected: ${userId} (Total: ${clients.size})`)

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
          break

        case 'place_order':
          const { pair, side, price, amount } = data.payload
          const result = orderBookService.placeOrder(pair, side, price, amount, userId)
          
          ws.send(JSON.stringify({
            type: 'order_result',
            payload: result,
          }))

          // Update user stats
          if (result.matched.fills.length > 0) {
            user.trades += result.matched.fills.length
            user.volume += result.matched.fills.reduce((sum, f) => sum + f.price * f.amount, 0)
          }
          clients.set(ws, user)
          break

        case 'subscribe':
          // Client subscribes to specific data
          ws.send(JSON.stringify({
            type: 'subscribed',
            payload: { channels: data.payload.channels }
          }))
          break

        case 'get_orderbook':
          ws.send(JSON.stringify({
            type: 'orderbook_snapshot',
            payload: orderBookService.getOrderBook(data.payload.pair || 'FETH/FUSDT'),
          }))
          break

        case 'get_trades':
          ws.send(JSON.stringify({
            type: 'trades_snapshot',
            payload: trades.slice(0, 50),
          }))
          break
      }
    } catch (e) {
      console.error('Message error:', e)
    }
  })

  ws.on('close', () => {
    const user = clients.get(ws)
    clients.delete(ws)
    broadcast({ type: 'user_left', payload: { connectedUsers: clients.size } })
    console.log(`❌ User disconnected: ${user?.id} (Total: ${clients.size})`)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('   🚀 FlashDEX Backend Server Started')
  console.log('═══════════════════════════════════════════')
  console.log(`   HTTP:      http://localhost:${PORT}`)
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`)
  console.log(`   Health:    http://localhost:${PORT}/health`)
  console.log('═══════════════════════════════════════════')
  console.log('')

  // Start services
  priceFeed.start()
  orderBookService.start()
  onChainService.start()
  
  // Start market maker if private key available
  if (process.env.PRIVATE_KEY && process.env.ENABLE_MARKET_MAKER === 'true') {
    marketMaker.start()
  }
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...')
  priceFeed.stop()
  orderBookService.stop()
  onChainService.stop()
  marketMaker.stop()
  server.close()
  process.exit(0)
})
