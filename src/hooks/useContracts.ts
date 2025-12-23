import { useCallback, useMemo } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, type Address } from 'viem'
import { toast } from 'sonner'
import { 
  CONTRACTS, 
  TOKENS as _TOKENS, 
  ERC20_ABI, 
  VAULT_ABI, 
  FAUCET_ABI 
} from '../config/contracts'
import { monadTestnet } from '../config/monad'

// ============ TOKEN HOOKS ============

/**
 * Get ERC20 token balance for connected wallet
 */
export function useTokenBalance(tokenAddress: Address) {
  const { address } = useAccount()
  
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refresh every 10s
    },
  })
}

/**
 * Get token allowance for vault
 */
export function useTokenAllowance(tokenAddress: Address) {
  const { address } = useAccount()
  
  return useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT] : undefined,
    query: {
      enabled: !!address,
    },
  })
}

/**
 * Approve vault to spend tokens
 */
export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const approve = useCallback(async (tokenAddress: Address, amount: bigint) => {
    try {
      writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.VAULT, amount],
        chain: monadTestnet,
      })
      toast.info('Approval submitted...')
    } catch (e) {
      console.error('Approve error:', e)
      toast.error('Approval failed')
    }
  }, [writeContract])
  
  return {
    approve,
    isApproving: isPending || isConfirming,
    isApproved: isSuccess,
    error,
    hash,
  }
}

// ============ VAULT HOOKS ============

/**
 * Get user's vault balance for a token
 */
export function useVaultBalance(tokenAddress: Address) {
  const { address } = useAccount()
  
  return useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'getBalance',
    args: address ? [tokenAddress, address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Refresh every 5s
    },
  })
}

/**
 * Get all vault balances for user
 */
export function useAllVaultBalances() {
  const { address } = useAccount()
  
  return useReadContract({
    address: CONTRACTS.VAULT,
    abi: VAULT_ABI,
    functionName: 'getUserBalances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  })
}

/**
 * Deposit tokens to vault
 */
export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const deposit = useCallback(async (tokenAddress: Address, amount: bigint) => {
    try {
      writeContract({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [tokenAddress, amount],
        chain: monadTestnet,
      })
      toast.info('Deposit submitted...')
    } catch (e) {
      console.error('Deposit error:', e)
      toast.error('Deposit failed')
    }
  }, [writeContract])
  
  return {
    deposit,
    isDepositing: isPending || isConfirming,
    isDeposited: isSuccess,
    error,
    hash,
  }
}

/**
 * Withdraw tokens from vault
 */
export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const withdraw = useCallback(async (tokenAddress: Address, amount: bigint) => {
    try {
      writeContract({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [tokenAddress, amount],
        chain: monadTestnet,
      })
      toast.info('Withdrawal submitted...')
    } catch (e) {
      console.error('Withdraw error:', e)
      toast.error('Withdrawal failed')
    }
  }, [writeContract])
  
  return {
    withdraw,
    isWithdrawing: isPending || isConfirming,
    isWithdrawn: isSuccess,
    error,
    hash,
  }
}

// ============ FAUCET HOOKS ============

/**
 * Check if user can claim from faucet
 */
export function useFaucetStatus() {
  const { address } = useAccount()
  
  const { data: canClaim } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 30000, // Refresh every 30s
    },
  })
  
  const { data: timeUntil } = useReadContract({
    address: CONTRACTS.FAUCET,
    abi: FAUCET_ABI,
    functionName: 'timeUntilClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 1000, // Refresh every second for countdown
    },
  })
  
  return {
    canClaim: canClaim as boolean | undefined,
    timeUntilClaim: timeUntil as bigint | undefined,
  }
}

/**
 * Claim tokens from faucet
 */
export function useFaucetClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })
  
  const claim = useCallback(async () => {
    try {
      writeContract({
        address: CONTRACTS.FAUCET,
        abi: FAUCET_ABI,
        functionName: 'claim',
        args: [],
        chain: monadTestnet,
      })
      toast.info('Claiming tokens...')
    } catch (e) {
      console.error('Claim error:', e)
      toast.error('Claim failed')
    }
  }, [writeContract])
  
  return {
    claim,
    isClaiming: isPending || isConfirming,
    isClaimed: isSuccess,
    error,
    hash,
  }
}

// ============ COMBINED HOOKS ============

/**
 * Get all token balances (wallet + vault)
 */
export function useAllBalances() {
  const { address } = useAccount()
  
  // Wallet balances
  const { data: fethWallet } = useTokenBalance(CONTRACTS.FETH)
  const { data: fusdtWallet } = useTokenBalance(CONTRACTS.FUSDT)
  const { data: fbtcWallet } = useTokenBalance(CONTRACTS.FBTC)
  
  // Vault balances
  const { data: fethVault } = useVaultBalance(CONTRACTS.FETH)
  const { data: fusdtVault } = useVaultBalance(CONTRACTS.FUSDT)
  const { data: fbtcVault } = useVaultBalance(CONTRACTS.FBTC)
  
  return useMemo(() => ({
    FETH: {
      wallet: fethWallet as bigint | undefined,
      vault: fethVault as bigint | undefined,
      walletFormatted: fethWallet ? formatUnits(fethWallet as bigint, 18) : '0',
      vaultFormatted: fethVault ? formatUnits(fethVault as bigint, 18) : '0',
    },
    FUSDT: {
      wallet: fusdtWallet as bigint | undefined,
      vault: fusdtVault as bigint | undefined,
      walletFormatted: fusdtWallet ? formatUnits(fusdtWallet as bigint, 6) : '0',
      vaultFormatted: fusdtVault ? formatUnits(fusdtVault as bigint, 6) : '0',
    },
    FBTC: {
      wallet: fbtcWallet as bigint | undefined,
      vault: fbtcVault as bigint | undefined,
      walletFormatted: fbtcWallet ? formatUnits(fbtcWallet as bigint, 8) : '0',
      vaultFormatted: fbtcVault ? formatUnits(fbtcVault as bigint, 8) : '0',
    },
    isConnected: !!address,
  }), [address, fethWallet, fusdtWallet, fbtcWallet, fethVault, fusdtVault, fbtcVault])
}

/**
 * Full deposit flow with approval check
 */
export function useDepositWithApproval() {
  const { approve, isApproving, isApproved: _isApproved } = useApproveToken()
  const { deposit, isDepositing, isDeposited } = useDeposit()
  
  const depositWithApproval = useCallback(async (
    tokenAddress: Address,
    amount: string,
    decimals: number,
    currentAllowance: bigint
  ) => {
    const amountBigInt = parseUnits(amount, decimals)
    
    // Check if approval needed
    if (currentAllowance < amountBigInt) {
      await approve(tokenAddress, amountBigInt)
      toast.info('Please approve the transaction, then deposit')
      return 'approval_needed'
    }
    
    // Proceed with deposit
    await deposit(tokenAddress, amountBigInt)
    return 'depositing'
  }, [approve, deposit])
  
  return {
    depositWithApproval,
    isProcessing: isApproving || isDepositing,
    isComplete: isDeposited,
  }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format token amount with appropriate decimals
 */
export function formatTokenAmount(
  amount: bigint | undefined, 
  decimals: number,
  displayDecimals: number = 4
): string {
  if (!amount) return '0'
  const formatted = formatUnits(amount, decimals)
  const num = parseFloat(formatted)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  })
}

/**
 * Parse token amount from string to bigint
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    return parseUnits(amount, decimals)
  } catch {
    return BigInt(0)
  }
}
