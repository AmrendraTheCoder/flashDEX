# FlashDEX - Hybrid Decentralized Exchange

A high-performance hybrid DEX built on Monad Testnet featuring off-chain order matching with on-chain settlement.

## 🚀 Features

- **Hybrid Architecture**: Fast off-chain matching engine + secure on-chain settlement
- **Real-time Trading**: Live price charts, order book, and recent trades
- **On-Chain Mode**: Toggle between simulated (⚡ Fast) and real blockchain (🔗 On-Chain) data
- **Portfolio Management**: Track holdings, positions, orders, and trade history
- **Testnet Faucet**: Claim free FETH, FUSDT, and FBTC tokens
- **Vault System**: Deposit tokens to enable on-chain trading

## 📋 Deployed Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| FlashETH (FETH) | `0x35895ffaBB85255232c3575137591277Fb1BC433` |
| FlashUSDT (FUSDT) | `0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081` |
| FlashBTC (FBTC) | `0xCEa63bF96B1F830bA950d478265e1bdde12063A9` |
| FlashFaucet | `0xa6E696983469b4D7bF80DEabec310840AAcb981F` |
| FlashOracle | `0xE7CFE8395735140A22a40430E6922334dCB37c55` |
| FlashVault | `0xeDc61C052e92935E07366b25B4D082AF16AC0476` |
| OrderBookV2 | `0x6BD87ee70b9333474333680c846AFD2Ca65BC33c` |

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- A wallet (MetaMask recommended)
- Monad Testnet MON tokens for gas

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎮 Demo Guide

### Step 1: Setup Wallet

1. Install MetaMask browser extension
2. Add Monad Testnet network:
   - Network Name: `Monad Testnet`
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency Symbol: `MON`
   - Explorer: `https://testnet.monadexplorer.com`

3. Get testnet MON from [Monad Faucet](https://faucet.monad.xyz)

### Step 2: Connect & Get Tokens

1. Click "Connect Wallet" in the app header
2. Approve the connection in MetaMask
3. Open the Faucet panel (sidebar)
4. Click "Claim All Tokens" to get:
   - 10 FETH (Flash ETH)
   - 10,000 FUSDT (Flash USDT)
   - 0.5 FBTC (Flash BTC)

### Step 3: Deposit to Vault

To trade on-chain, you need to deposit tokens to the vault:

1. Open the Vault panel (sidebar)
2. Select a token (e.g., FUSDT)
3. Enter amount to deposit
4. Click "Deposit" and confirm in MetaMask
5. Repeat for other tokens you want to trade

### Step 4: Trading

#### Fast Mode (⚡) - Simulated
- Default mode with simulated order book
- Instant order execution
- Great for testing UI/UX

#### On-Chain Mode (🔗) - Real Transactions
1. Click the mode toggle button (⚡/🔗) to switch to On-Chain
2. All components sync to show real blockchain data
3. Place orders that execute on Monad Testnet
4. View real transactions in the explorer

### Step 5: Place an Order

1. Select trading pair (FETH/FUSDT, FBTC/FUSDT)
2. Choose Buy or Sell
3. Select order type (Limit, Market, Stop-Limit)
4. Enter price and amount
5. Click "Place Order"
6. Confirm transaction in MetaMask (On-Chain mode)

### Step 6: View Portfolio

Navigate to Portfolio tab to see:
- **Overview**: Token holdings with wallet/vault breakdown
- **Positions**: Open trading positions with P&L
- **Orders**: Active orders (cancel available)
- **History**: Completed trades

## 🔄 Mode Toggle

The app has a universal mode toggle that syncs across all components:

| Mode | Icon | Description |
|------|------|-------------|
| Fast | ⚡ | Simulated data, instant updates |
| On-Chain | 🔗 | Real blockchain data, actual transactions |

Components affected:
- Price Chart
- Order Book
- Recent Trades
- Trading Panel
- Portfolio

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  ⚡ Fast Mode          │        🔗 On-Chain Mode        │
│  - Simulated data      │        - Real contract calls   │
│  - Local state         │        - wagmi/viem hooks      │
│  - Instant updates     │        - 3s refresh interval   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  Monad Testnet (Chain 10143)            │
├─────────────────────────────────────────────────────────┤
│  FlashToken (x3)  │  FlashVault  │  OrderBookV2        │
│  FlashFaucet      │  FlashOracle │                     │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Testing Contracts

```bash
# Check wallet balance
npx hardhat run scripts/check-balance.cjs --network monad

# Test contract interactions
npx hardhat run scripts/test-contracts.cjs --network monad
```

## 📁 Project Structure

```
├── contracts/          # Solidity smart contracts
├── scripts/            # Deployment & testing scripts
├── src/
│   ├── components/     # React components
│   ├── config/         # Contract addresses & ABIs
│   ├── hooks/          # Custom React hooks
│   └── store/          # Zustand state management
└── public/             # Static assets
```

## 🔧 Environment Variables

Create a `.env` file:

```env
PRIVATE_KEY=your_wallet_private_key
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

## 📜 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.
