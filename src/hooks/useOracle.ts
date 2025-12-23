import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, ORACLE_ABI } from '../config/contracts'

/**
 * Hook to get price from on-chain Oracle
 */
export function useOraclePrice(pair: string) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getPrice',
    args: [pair],
    query: {
      enabled: !!pair,
      refetchInterval: 5000, // Refresh every 5s
    },
  })

  const price = data ? Number(formatUnits((data as [bigint, bigint])[0], 6)) : 0
  const updatedAt = data ? Number((data as [bigint, bigint])[1]) : 0

  return { price, updatedAt, isLoading, error }
}

/**
 * Hook to get all prices from Oracle
 */
export function useAllOraclePrices() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.ORACLE,
    abi: ORACLE_ABI,
    functionName: 'getAllPrices',
    query: {
      refetchInterval: 5000,
    },
  })

  if (!data) return { prices: {}, isLoading }

  const [symbols, priceValues] = data as [string[], bigint[]]
  const prices: Record<string, number> = {}
  
  symbols.forEach((symbol, i) => {
    prices[symbol] = Number(formatUnits(priceValues[i], 6))
  })

  return { prices, isLoading }
}
