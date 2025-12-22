import { defineChain } from 'viem'
import { http, createConfig } from 'wagmi'

// Monad Testnet Configuration
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
})

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
})

// Trading pairs
export const TRADING_PAIRS = [
  { symbol: 'ETH/USDT', base: 'ETH', quote: 'USDT', basePrice: 3500 },
  { symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', basePrice: 95000 },
  { symbol: 'MON/USDT', base: 'MON', quote: 'USDT', basePrice: 2.5 },
] as const

export type TradingPair = typeof TRADING_PAIRS[number]
