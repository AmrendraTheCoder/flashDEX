import { type Address } from 'viem'

/**
 * Contract addresses for FlashDEX on Monad Testnet
 * Update these after deployment
 */
export const CONTRACTS = {
  // Token contracts - Deployed on Monad Testnet
  FETH: '0x35895ffaBB85255232c3575137591277Fb1BC433' as Address, // Flash ETH
  FUSDT: '0xB52c6e73c071AB63B18b6bAF9604B84f0DD71081' as Address, // Flash USDT
  FBTC: '0xCEa63bF96B1F830bA950d478265e1bdde12063A9' as Address, // Flash BTC
  
  // Core contracts - Deployed on Monad Testnet
  VAULT: '0xeDc61C052e92935E07366b25B4D082AF16AC0476' as Address, // FlashVault
  FAUCET: '0xa6E696983469b4D7bF80DEabec310840AAcb981F' as Address, // FlashFaucet
  ORACLE: '0xE7CFE8395735140A22a40430E6922334dCB37c55' as Address, // FlashOracle
  ORDERBOOK: '0x6BD87ee70b9333474333680c846AFD2Ca65BC33c' as Address, // OrderBookV2
} as const

/**
 * Token metadata
 */
export const TOKENS = {
  FETH: {
    address: CONTRACTS.FETH,
    symbol: 'FETH',
    name: 'Flash ETH',
    decimals: 18,
    icon: '⟠',
  },
  FUSDT: {
    address: CONTRACTS.FUSDT,
    symbol: 'FUSDT',
    name: 'Flash USDT',
    decimals: 6,
    icon: '💵',
  },
  FBTC: {
    address: CONTRACTS.FBTC,
    symbol: 'FBTC',
    name: 'Flash BTC',
    decimals: 8,
    icon: '₿',
  },
} as const

/**
 * Trading pair configuration with token addresses
 */
export const TRADING_PAIRS_CONFIG = [
  {
    symbol: 'ETH/USDT',
    baseToken: CONTRACTS.FETH,
    quoteToken: CONTRACTS.FUSDT,
    baseDecimals: 18,
    quoteDecimals: 6,
  },
  {
    symbol: 'BTC/USDT',
    baseToken: CONTRACTS.FBTC,
    quoteToken: CONTRACTS.FUSDT,
    baseDecimals: 8,
    quoteDecimals: 6,
  },
] as const

// ============ ABIs ============

/**
 * Minimal ERC20 ABI for token interactions
 */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  // Events
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Approval',
    type: 'event',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'spender', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * FlashVault ABI for deposit, withdraw, and settlement
 */
export const VAULT_ABI = [
  // Read functions
  {
    name: 'balances',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'user', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getUserBalances',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'tokens', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
  },
  {
    name: 'supportedTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'isTradeSettled',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tradeId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Write functions
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  // Events
  {
    name: 'Deposited',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'Withdrawn',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'newBalance', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'TradeSettled',
    type: 'event',
    inputs: [
      { name: 'tradeId', type: 'bytes32', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'baseToken', type: 'address', indexed: false },
      { name: 'quoteToken', type: 'address', indexed: false },
      { name: 'baseAmount', type: 'uint256', indexed: false },
      { name: 'quoteAmount', type: 'uint256', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * FlashFaucet ABI for claiming testnet tokens
 */
export const FAUCET_ABI = [
  // Read functions
  {
    name: 'canClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'timeUntilClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lastClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAllTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'token', type: 'address' },
          { name: 'dripAmount', type: 'uint96' },
        ],
      },
    ],
  },
  // Write functions
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // Events
  {
    name: 'Claimed',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * FlashOracle ABI for price feeds
 */
export const ORACLE_ABI = [
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'pair', type: 'string' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
    ],
  },
  {
    name: 'getPriceWithValidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'pair', type: 'string' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'isValid', type: 'bool' },
    ],
  },
  {
    name: 'getAllPrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'symbols', type: 'string[]' },
      { name: 'prices', type: 'uint256[]' },
    ],
  },
  // Events
  {
    name: 'PriceUpdated',
    type: 'event',
    inputs: [
      { name: 'pairHash', type: 'bytes32', indexed: true },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * OrderBookV2 ABI for on-chain order book
 */
export const ORDERBOOK_ABI = [
  // Read functions
  {
    name: 'getOrderBook',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'depth', type: 'uint256' }],
    outputs: [
      { name: 'bidPrices', type: 'uint96[]' },
      { name: 'bidAmounts', type: 'uint96[]' },
      { name: 'askPrices', type: 'uint96[]' },
      { name: 'askAmounts', type: 'uint96[]' },
    ],
  },
  {
    name: 'getUserOrders',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint64' },
          { name: 'trader', type: 'address' },
          { name: 'timestamp', type: 'uint48' },
          { name: 'orderType', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'isBuy', type: 'bool' },
          { name: 'price', type: 'uint96' },
          { name: 'amount', type: 'uint96' },
          { name: 'filledAmount', type: 'uint96' },
          { name: 'stopPrice', type: 'uint96' },
          { name: 'visibleAmount', type: 'uint96' },
        ],
      },
    ],
  },
  {
    name: 'getRecentTrades',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'count', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint64' },
          { name: 'buyOrderId', type: 'uint64' },
          { name: 'sellOrderId', type: 'uint64' },
          { name: 'price', type: 'uint96' },
          { name: 'amount', type: 'uint96' },
          { name: 'timestamp', type: 'uint48' },
        ],
      },
    ],
  },
  {
    name: 'getStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_totalVolume', type: 'uint256' },
      { name: '_totalTrades', type: 'uint256' },
      { name: '_lastPrice', type: 'uint96' },
      { name: '_buyLevels', type: 'uint256' },
      { name: '_sellLevels', type: 'uint256' },
    ],
  },
  {
    name: 'orders',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint64' }],
    outputs: [
      { name: 'id', type: 'uint64' },
      { name: 'trader', type: 'address' },
      { name: 'timestamp', type: 'uint48' },
      { name: 'orderType', type: 'uint8' },
      { name: 'status', type: 'uint8' },
      { name: 'isBuy', type: 'bool' },
      { name: 'price', type: 'uint96' },
      { name: 'amount', type: 'uint96' },
      { name: 'filledAmount', type: 'uint96' },
      { name: 'stopPrice', type: 'uint96' },
      { name: 'visibleAmount', type: 'uint96' },
    ],
  },
  // Write functions
  {
    name: 'placeOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'price', type: 'uint96' },
      { name: 'amount', type: 'uint96' },
      { name: 'isBuy', type: 'bool' },
      { name: 'orderType', type: 'uint8' },
      { name: 'stopPrice', type: 'uint96' },
      { name: 'visibleAmount', type: 'uint96' },
    ],
    outputs: [{ name: 'orderId', type: 'uint64' }],
  },
  {
    name: 'cancelOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'uint64' }],
    outputs: [],
  },
  {
    name: 'batchPlaceOrders',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'prices', type: 'uint96[]' },
      { name: 'amounts', type: 'uint96[]' },
      { name: 'isBuys', type: 'bool[]' },
    ],
    outputs: [{ name: 'orderIds', type: 'uint64[]' }],
  },
  // Events
  {
    name: 'OrderPlaced',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint64', indexed: true },
      { name: 'trader', type: 'address', indexed: true },
      { name: 'isBuy', type: 'bool', indexed: false },
      { name: 'price', type: 'uint96', indexed: false },
      { name: 'amount', type: 'uint96', indexed: false },
      { name: 'orderType', type: 'uint8', indexed: false },
    ],
  },
  {
    name: 'OrderFilled',
    type: 'event',
    inputs: [
      { name: 'orderId', type: 'uint64', indexed: true },
      { name: 'tradeId', type: 'uint64', indexed: true },
      { name: 'fillAmount', type: 'uint96', indexed: false },
      { name: 'fillPrice', type: 'uint96', indexed: false },
    ],
  },
  {
    name: 'OrderCancelled',
    type: 'event',
    inputs: [{ name: 'id', type: 'uint64', indexed: true }],
  },
  {
    name: 'TradeExecuted',
    type: 'event',
    inputs: [
      { name: 'id', type: 'uint64', indexed: true },
      { name: 'buyer', type: 'address', indexed: false },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'price', type: 'uint96', indexed: false },
      { name: 'amount', type: 'uint96', indexed: false },
    ],
  },
] as const
