import { useEffect, useCallback } from 'react'
import { useWatchContractEvent, usePublicClient } from 'wagmi'
import { type Address, type Log } from 'viem'
import { toast } from 'sonner'
import { CONTRACTS, VAULT_ABI, FAUCET_ABI } from '../config/contracts'
import { useOrderBookStore } from '../store/orderBookStore'
import { soundManager } from '../utils/sounds'

/**
 * Watch for TradeSettled events from the vault
 * Updates the order book store when trades are settled on-chain
 */
export function useTradeSettledEvents() {
  const { addTrade, currentPair } = useOrderBookStore()
  
  useWatchContractEvent({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    eventName: 'TradeSettled',
    onLogs(logs) {
      logs.forEach((log: Log) => {
        const { args } = log as any
        if (!args) return
        
        const { tradeId, buyer, seller, baseToken, baseAmount, price, timestamp } = args
        
        // Determine pair from tokens
        let pair = 'ETH/USDT'
        if (baseToken === CONTRACTS.FBTC) pair = 'BTC/USDT'
        
        // Only process if it matches current pair
        if (pair !== currentPair.symbol) return
        
        // Add trade to store
        addTrade({
          id: tradeId as string,
          price: Number(price) / 1e6, // Assuming 6 decimal quote
          amount: Number(baseAmount) / 1e18, // Assuming 18 decimal base
          side: 'buy', // Determined by context
          timestamp: Number(timestamp) * 1000,
          buyer: buyer as string,
          seller: seller as string,
          pair,
        })
        
        // Play sound and show notification
        soundManager.playOrderFilled()
        toast.success(`Trade settled: ${(Number(baseAmount) / 1e18).toFixed(4)} ${pair.split('/')[0]}`)
      })
    },
  })
}

/**
 * Watch for Deposited events
 * Shows notifications when user deposits complete
 */
export function useDepositEvents(userAddress: Address | undefined) {
  useWatchContractEvent({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    eventName: 'Deposited',
    onLogs(logs) {
      logs.forEach((log: Log) => {
        const { args } = log as any
        if (!args || !userAddress) return
        
        const { user, token, amount, newBalance: _newBalance } = args
        
        // Only show for current user
        if ((user as string).toLowerCase() !== userAddress.toLowerCase()) return
        
        // Determine token symbol
        let symbol = 'tokens'
        if (token === CONTRACTS.FETH) symbol = 'FETH'
        else if (token === CONTRACTS.FUSDT) symbol = 'FUSDT'
        else if (token === CONTRACTS.FBTC) symbol = 'FBTC'
        
        const formattedAmount = symbol === 'FUSDT' 
          ? (Number(amount) / 1e6).toFixed(2)
          : (Number(amount) / 1e18).toFixed(4)
        
        toast.success(`Deposited ${formattedAmount} ${symbol}`)
        soundManager.playBuy()
      })
    },
  })
}

/**
 * Watch for Withdrawn events
 */
export function useWithdrawEvents(userAddress: Address | undefined) {
  useWatchContractEvent({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    eventName: 'Withdrawn',
    onLogs(logs) {
      logs.forEach((log: Log) => {
        const { args } = log as any
        if (!args || !userAddress) return
        
        const { user, token, amount } = args
        
        if ((user as string).toLowerCase() !== userAddress.toLowerCase()) return
        
        let symbol = 'tokens'
        if (token === CONTRACTS.FETH) symbol = 'FETH'
        else if (token === CONTRACTS.FUSDT) symbol = 'FUSDT'
        else if (token === CONTRACTS.FBTC) symbol = 'FBTC'
        
        const formattedAmount = symbol === 'FUSDT' 
          ? (Number(amount) / 1e6).toFixed(2)
          : (Number(amount) / 1e18).toFixed(4)
        
        toast.success(`Withdrawn ${formattedAmount} ${symbol}`)
        soundManager.playSell()
      })
    },
  })
}

/**
 * Watch for faucet claim events
 */
export function useFaucetClaimEvents(userAddress: Address | undefined) {
  useWatchContractEvent({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    eventName: 'Claimed',
    onLogs(logs) {
      logs.forEach((log: Log) => {
        const { args } = log as any
        if (!args || !userAddress) return
        
        const { user } = args
        
        if ((user as string).toLowerCase() !== userAddress.toLowerCase()) return
        
        toast.success('Tokens claimed! Check your wallet.')
        soundManager.playAchievement()
      })
    },
  })
}

/**
 * Combined hook to watch all relevant events for a user
 */
export function useContractEvents() {
  // Note: In a production app, you'd get userAddress from useAccount
  // and pass it to these hooks
  
  useTradeSettledEvents()
  
  // Deposit, withdraw, and faucet events require userAddress
  // which should be passed in from the component using useAccount
}

/**
 * Hook to sync contract state on mount
 * Fetches recent events to populate initial state
 */
export function useSyncOnChainState() {
  const publicClient = usePublicClient()
  const { addTrade } = useOrderBookStore()
  
  const syncRecentTrades = useCallback(async () => {
    if (!publicClient) return
    
    try {
      // Get recent TradeSettled events (last 100 blocks)
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock > 100n ? currentBlock - 100n : 0n
      
      const logs = await publicClient.getLogs({
        address: CONTRACTS.VAULT,
        event: {
          type: 'event',
          name: 'TradeSettled',
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
        fromBlock,
        toBlock: currentBlock,
      })
      
      // Process and add to store
      logs.forEach((log) => {
        const args = log.args as any
        if (!args) return
        
        let pair = 'ETH/USDT'
        if (args.baseToken === CONTRACTS.FBTC) pair = 'BTC/USDT'
        
        addTrade({
          id: args.tradeId || `onchain-${log.transactionHash}`,
          price: Number(args.price || 0) / 1e6,
          amount: Number(args.baseAmount || 0) / 1e18,
          side: 'buy',
          timestamp: Number(args.timestamp || 0) * 1000,
          buyer: args.buyer || '',
          seller: args.seller || '',
          pair,
        })
      })
      
      console.log(`Synced ${logs.length} on-chain trades`)
    } catch (error) {
      console.error('Failed to sync on-chain state:', error)
    }
  }, [publicClient, addTrade])
  
  useEffect(() => {
    syncRecentTrades()
  }, [syncRecentTrades])
  
  return { syncRecentTrades }
}
