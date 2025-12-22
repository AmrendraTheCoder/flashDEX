import { type Address } from 'viem'

/**
 * Contract addresses for FlashDEX on Monad Testnet
 * Update these after deployment
 */
export const CONTRACTS = {
  // Token contracts
  FETH: '0x0000000000000000000000000000000000000001' as Address, // Flash ETH - update after deployment
  FUSDT: '0x0000000000000000000000000000000000000002' as Address, // Flash USDT - update after deployment
  FBTC: '0x0000000000000000000000000000000000000003' as Address, // Flash BTC - update after deployment
  
  // Core contracts
  VAULT: '0x0000000000000000000000000000000000000004' as Address, // FlashVault - update after deployment
  FAUCET: '0x0000000000000000000000000000000000000005' as Address, // FlashFaucet - update after deployment
  ORACLE: '0x0000000000000000000000000000000000000006' as Address, // FlashOracle - update after deployment
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
    decimals: 18,
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
    baseDecimals: 18,
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
