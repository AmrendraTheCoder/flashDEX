# FlashDEX - Project Overview

> A hybrid decentralized exchange (DEX) built on Monad Testnet

---

## 🎯 What is FlashDEX?

FlashDEX is a **crypto trading platform** that combines the speed of centralized exchanges with the security of blockchain. Think of it like Binance or Coinbase, but running on blockchain.

### The Hybrid Approach

| Traditional DEX | FlashDEX (Hybrid) |
|-----------------|-------------------|
| Slow (every action on blockchain) | Fast (matching off-chain) |
| Expensive gas fees | Lower costs |
| Limited features | Full trading features |
| 100% on-chain | Settlement on-chain |

---

## ✅ What's Working

### 1. Smart Contracts (Fully Deployed)
All contracts are live on Monad Testnet:

| Contract | Purpose | Status |
|----------|---------|--------|
| **FlashETH** | Test ETH token | ✅ Working |
| **FlashUSDT** | Test stablecoin | ✅ Working |
| **FlashBTC** | Test BTC token | ✅ Working |
| **FlashFaucet** | Free token claims | ✅ Working |
| **FlashVault** | Token deposits for trading | ✅ Working |
| **FlashOracle** | Price feeds | ✅ Working |
| **OrderBookV2** | Order matching & trades | ✅ Working |

### 2. Frontend Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Wallet Connection** | Connect MetaMask to Monad | ✅ Working |
| **Price Chart** | Live candlestick chart | ✅ Working |
| **Order Book** | Buy/sell orders display | ✅ Working |
| **Recent Trades** | Trade history list | ✅ Working |
| **Trading Panel** | Place buy/sell orders | ✅ Working |
| **Portfolio** | View holdings & orders | ✅ Working |
| **Faucet** | Claim free test tokens | ✅ Working |
| **Vault** | Deposit/withdraw tokens | ✅ Working |
| **Mode Toggle** | Switch Fast/On-Chain | ✅ Working |

### 3. Two Trading Modes

#### ⚡ Fast Mode (Simulated)
- Instant order execution
- Simulated order book data
- No gas fees
- Great for testing UI

#### 🔗 On-Chain Mode (Real)
- Real blockchain transactions
- Actual token transfers
- Requires MON for gas
- Permanent on blockchain

---

## 🔄 How It Works

### Simple Flow

```
1. Connect Wallet
      ↓
2. Get Test Tokens (Faucet)
      ↓
3. Deposit to Vault
      ↓
4. Place Orders
      ↓
5. Orders Match → Trade Executes
      ↓
6. Tokens Transfer
```

### Detailed Flow

```
┌─────────────────────────────────────────────────────────┐
│                      USER                                │
│                        │                                 │
│            ┌───────────┴───────────┐                    │
│            ▼                       ▼                    │
│     ⚡ Fast Mode              🔗 On-Chain Mode          │
│     (Simulated)               (Real Blockchain)         │
│            │                       │                    │
│            ▼                       ▼                    │
│     Local State              Smart Contracts            │
│     (Instant)                (3-5 sec confirm)          │
└─────────────────────────────────────────────────────────┘
```

---

## ⚠️ What's NOT Working / Limitations

### 1. Production WebSocket Server
- **Issue**: The production WebSocket server (`wss://flashdex-ws.onrender.com`) needs deployment
- **Impact**: Production build won't have real-time updates until deployed
- **Solution**: Run `npm run server` locally, or deploy to Render/Railway

### 2. Market Maker Bot (Optional)
- **Issue**: Requires private key with funded wallet
- **Impact**: No automated liquidity without bot
- **Note**: Set `ENABLE_MARKET_MAKER=true` and `PRIVATE_KEY` in .env

### 3. Price Oracle Updates
- **Issue**: Oracle prices are static (set during deployment)
- **Impact**: On-chain prices don't reflect simulated prices
- **Note**: Backend provides simulated prices for Fast mode

### 4. Order Matching On-Chain
- **Issue**: On-chain orders need a counterparty
- **Impact**: Your buy order needs someone's sell order to match
- **Workaround**: Use Fast mode for instant matching, or enable market maker bot

---

## 🚧 What's Left to Build

### Implemented ✅

| Feature | Description | Status |
|---------|-------------|--------|
| **Backend Server** | Real matching engine | ✅ Done |
| **WebSocket** | Real-time updates | ✅ Done |
| **Order Matching** | Off-chain order matching | ✅ Done |
| **Price Feed** | Simulated price updates | ✅ Done |
| **Market Maker Bot** | Auto liquidity (optional) | ✅ Done |

### Nice to Have (Future)

| Feature | Description | Difficulty |
|---------|-------------|------------|
| **Trade History Export** | Download CSV | Easy |
| **Price Alerts** | Notifications | Medium |
| **Advanced Orders** | OCO, Trailing Stop | Hard |
| **Mobile App** | React Native | Hard |
| **Mainnet Deploy** | Production ready | Medium |
| **Real Price Feeds** | Chainlink/Pyth integration | Medium |

---

## 🎮 Demo Instructions

### Prerequisites
1. MetaMask browser extension
2. Monad Testnet configured
3. MON tokens for gas (from Monad faucet)

### Step-by-Step Demo

#### Step 1: Setup (One Time)
```
1. Install MetaMask
2. Add Monad Testnet:
   - Network: Monad Testnet
   - RPC: https://testnet-rpc.monad.xyz
   - Chain ID: 10143
   - Symbol: MON
3. Get MON from faucet.monad.xyz
```

#### Step 2: Get Test Tokens
```
1. Open FlashDEX
2. Connect wallet (top right)
3. Open Faucet (sidebar)
4. Click "Claim All Tokens"
5. Confirm in MetaMask
6. Wait for confirmation
```

#### Step 3: Deposit to Vault
```
1. Open Vault panel
2. Select FUSDT
3. Enter amount (e.g., 5000)
4. Click Approve → Confirm
5. Click Deposit → Confirm
6. Repeat for FETH
```

#### Step 4: Place a Trade
```
1. Switch to 🔗 On-Chain mode
2. Select FETH/FUSDT pair
3. Click "Buy"
4. Enter price: 2500
5. Enter amount: 0.1
6. Click "Place Buy Order"
7. Confirm in MetaMask
```

#### Step 5: View Results
```
1. Check Order Book - your order appears
2. Check Portfolio → Orders tab
3. Check Recent Trades after match
```

---

## 📁 Project Structure

```
flashdex/
├── contracts/           # Solidity smart contracts
│   ├── FlashToken.sol   # ERC20 token template
│   ├── FlashFaucet.sol  # Token faucet
│   ├── FlashVault.sol   # Deposit vault
│   ├── FlashOracle.sol  # Price oracle
│   └── OrderBookV2.sol  # Trading engine
│
├── src/
│   ├── components/      # React UI components
│   │   ├── Header.tsx
│   │   ├── PriceChart.tsx
│   │   ├── OrderBook.tsx
│   │   ├── TradingPanel.tsx
│   │   ├── Portfolio.tsx
│   │   └── ...
│   │
│   ├── hooks/           # React hooks for contracts
│   │   ├── useContracts.ts
│   │   ├── useOrderBook.ts
│   │   └── useOracle.ts
│   │
│   ├── store/           # State management
│   │   ├── orderBookStore.ts
│   │   └── uiStore.ts
│   │
│   └── config/          # Configuration
│       ├── contracts.ts # Addresses & ABIs
│       └── monad.ts     # Chain config
│
├── scripts/             # Deployment scripts
└── public/              # Static files
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TypeScript + Vite |
| **Styling** | CSS (custom) |
| **State** | Zustand |
| **Blockchain** | wagmi + viem |
| **Charts** | Lightweight Charts |
| **Contracts** | Solidity + Hardhat |
| **Network** | Monad Testnet |

---

## 📊 Contract Addresses

```
FlashETH:    0x35895ffaBB85255232c3575137591277Fb1BC433
FlashUSDT:   0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081
FlashBTC:    0xCEa63bF96B1F830bA950d478265e1bdde12063A9
FlashFaucet: 0xa6E696983469b4D7bF80DEabec310840AAcb981F
FlashOracle: 0xE7CFE8395735140A22a40430E6922334dCB37c55
FlashVault:  0xeDc61C052e92935E07366b25B4D082AF16AC0476
OrderBookV2: 0x6BD87ee70b9333474333680c846AFD2Ca65BC33c
```

---

## 🎯 Key Takeaways

### What Makes This Project Special

1. **Hybrid Architecture** - Best of both worlds (speed + security)
2. **Full Trading UI** - Professional-grade interface
3. **Real Smart Contracts** - Actually deployed and working
4. **Two Modes** - Easy testing + real blockchain
5. **Complete Flow** - Faucet → Vault → Trade → Portfolio

### What You Can Demo

1. ✅ Connect wallet to Monad
2. ✅ Claim free test tokens
3. ✅ Deposit tokens to vault
4. ✅ Place buy/sell orders
5. ✅ View order book & trades
6. ✅ Track portfolio & history
7. ✅ Switch between Fast/On-Chain modes

### What Needs Work

1. ⚠️ Backend matching engine
2. ⚠️ Real-time WebSocket updates
3. ⚠️ Live price feeds
4. ⚠️ Production deployment

---

## 🚀 Quick Commands

```bash
# Install dependencies
npm install

# Start frontend only
npm run dev

# Start backend server only
npm run server

# Start both frontend + backend together
npm run dev:all

# Build for production
npm run build

# Deploy contracts (if needed)
npx hardhat run scripts/deploy.cjs --network monad
```

---

## 🖥️ Backend Server

The backend server provides:

### Features
1. **Real-time WebSocket** - Live price updates, order book, trades
2. **Price Feed Service** - Simulated price movements with volatility
3. **Order Book Service** - Full order matching engine
4. **On-Chain Service** - Fetches real blockchain data
5. **Market Maker Bot** - Optional automated trading (requires private key)

### Running the Server

```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev
```

Or run both together:
```bash
npm run dev:all
```

### Server Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:3001/health` | Health check |
| `http://localhost:3001/api/prices` | Current prices |
| `http://localhost:3001/api/orderbook?pair=FETH/FUSDT` | Order book |
| `http://localhost:3001/api/trades` | Recent trades |
| `http://localhost:3001/api/onchain` | On-chain data |
| `ws://localhost:3001/ws` | WebSocket connection |

### WebSocket Messages

**Incoming (from server):**
- `welcome` - Initial state on connect
- `price_update` - Price changes
- `orderbook_update` - Order book changes
- `new_trade` - New trade executed
- `onchain_update` - Blockchain data refresh

**Outgoing (to server):**
- `identify` - Identify with wallet address
- `place_order` - Place a new order
- `subscribe` - Subscribe to channels
- `get_orderbook` - Request order book snapshot
- `get_trades` - Request trades snapshot

### Environment Variables

```env
# Required for on-chain features
PRIVATE_KEY=your_wallet_private_key

# Optional: Enable market maker bot
ENABLE_MARKET_MAKER=true

# Server port (default: 3001)
PORT=3001
```

---

## 📞 Support

If something doesn't work:

1. Check MetaMask is on Monad Testnet
2. Make sure you have MON for gas
3. Try refreshing the page
4. Check browser console for errors

---

*Built with ❤️ on Monad Testnet*
