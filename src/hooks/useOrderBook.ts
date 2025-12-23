import { useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { toast } from 'sonner'
import { CONTRACTS, ORDERBOOK_ABI } from '../config/contracts'
import { monadTestnet } from '../config/monad'

/**
 * Get on-chain order book data
 */
export function useOnChainOrderBook(depth: number = 20) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.ORDERBOOK,
    abi: ORDERBOOK_ABI,
    functionName: 'getOrderBook',
    args: [BigInt(depth)],
    query: {
      refetchInterval: 3000, // Refresh every 3s
    },
  })

  if (!data) {
    return { bids: [], asks: [], isLoading, refetch }
  }

  const [bidPrices, bidAmounts, askPrices, askAmounts] = data as [bigint[], bigint[], bigint[], bigint[]]

  const bids = bidPrices.map((price, i) => ({
    price: Number(formatUnits(price, 6)),
    amount: Number(formatUnits(bidAmounts[i], 18)),
  })).filter(b => b.price > 0)

  const asks = askPrices.map((price, i) => ({
    price: Number(formatUnits(price, 6)),
    amount: Number(formatUnits(askAmounts[i], 18)),
  })).filter(a => a.price > 0)

  return { bids, asks, isLoading, refetch }
}

/**
 * Get on-chain order book stats
 */
export function useOrderBookStats() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.ORDERBOOK,
    abi: ORDERBOOK_ABI,
    functionName: 'getStats',
    query: {
      refetchInterval: 5000,
    },
  })

  if (!data) {
    return { totalVolume: 0, totalTrades: 0, lastPrice: 0, buyLevels: 0, sellLevels: 0, isLoading }
  }

  const [totalVolume, totalTrades, lastPrice, buyLevels, sellLevels] = data as [bigint, bigint, bigint, bigint, bigint]

  return {
    totalVolume: Number(formatUnits(totalVolume, 18)),
    totalTrades: Number(totalTrades),
    lastPrice: Number(formatUnits(lastPrice, 6)),
    buyLevels: Number(buyLevels),
    sellLevels: Number(sellLevels),
    isLoading,
  }
}

/**
 * Get recent trades from on-chain
 */
export function useOnChainTrades(count: number = 20) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.ORDERBOOK,
    abi: ORDERBOOK_ABI,
    functionName: 'getRecentTrades',
    args: [BigInt(count)],
    query: {
      refetchInterval: 3000,
    },
  })

  if (!data) return { trades: [], isLoading }

  const trades = (data as any[]).map((trade) => ({
    id: Number(trade.id),
    price: Number(formatUnits(trade.price, 6)),
    amount: Number(formatUnits(trade.amount, 18)),
    timestamp: Number(trade.timestamp) * 1000,
    buyOrderId: Number(trade.buyOrderId),
    sellOrderId: Number(trade.sellOrderId),
  })).filter(t => t.id > 0)

  return { trades, isLoading }
}

/**
 * Get user's orders from on-chain
 */
export function useUserOrders() {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.ORDERBOOK,
    abi: ORDERBOOK_ABI,
    functionName: 'getUserOrders',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  })

  if (!data) return { orders: [], isLoading, refetch }

  const orders = (data as any[]).map((order) => ({
    id: Number(order.id),
    trader: order.trader,
    price: Number(formatUnits(order.price, 6)),
    amount: Number(formatUnits(order.amount, 18)),
    filledAmount: Number(formatUnits(order.filledAmount, 18)),
    isBuy: order.isBuy,
    status: ['open', 'partial', 'filled', 'cancelled'][order.status] || 'unknown',
    orderType: order.orderType,
    timestamp: Number(order.timestamp) * 1000,
  })).filter(o => o.id > 0)

  return { orders, isLoading, refetch }
}

/**
 * Place order on-chain
 */
export function usePlaceOrder() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const placeOrder = useCallback(async (
    price: number,
    amount: number,
    isBuy: boolean,
    orderType: number = 0 // 0 = limit, 1 = market
  ) => {
    try {
      const priceWei = parseUnits(price.toString(), 6)
      const amountWei = parseUnits(amount.toString(), 18)

      writeContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'placeOrder',
        args: [priceWei, amountWei, isBuy, orderType, BigInt(0), BigInt(0)],
        chain: monadTestnet,
      })

      toast.info('Order submitted to blockchain...')
    } catch (e) {
      console.error('Place order error:', e)
      toast.error('Failed to place order')
    }
  }, [writeContract])

  return {
    placeOrder,
    isPlacing: isPending || isConfirming,
    isPlaced: isSuccess,
    error,
    hash,
  }
}

/**
 * Cancel order on-chain
 */
export function useCancelOrder() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const cancelOrder = useCallback(async (orderId: number) => {
    try {
      writeContract({
        address: CONTRACTS.ORDERBOOK,
        abi: ORDERBOOK_ABI,
        functionName: 'cancelOrder',
        args: [BigInt(orderId)],
        chain: monadTestnet,
      })

      toast.info('Cancelling order...')
    } catch (e) {
      console.error('Cancel order error:', e)
      toast.error('Failed to cancel order')
    }
  }, [writeContract])

  return {
    cancelOrder,
    isCancelling: isPending || isConfirming,
    isCancelled: isSuccess,
    error,
    hash,
  }
}
