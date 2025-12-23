import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { parseUnits } from 'viem'
import {
  useAllBalances,
  useDeposit,
  useWithdraw,
  useApproveToken,
  useTokenAllowance,
} from '../hooks/useContracts'
import { CONTRACTS, TOKENS } from '../config/contracts'

type TokenKey = 'FETH' | 'FUSDT' | 'FBTC'

export function VaultPanel() {
  const { isConnected } = useAccount()
  const balances = useAllBalances()
  const { deposit, isDepositing, isDeposited } = useDeposit()
  const { withdraw, isWithdrawing, isWithdrawn } = useWithdraw()
  const { approve, isApproving } = useApproveToken()

  const [selectedToken, setSelectedToken] = useState<TokenKey>('FETH')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit')

  // Get allowance for selected token
  const { data: allowance } = useTokenAllowance(CONTRACTS[selectedToken])

  const tokenInfo = TOKENS[selectedToken]
  const walletBalance = balances[selectedToken].walletFormatted
  const vaultBalance = balances[selectedToken].vaultFormatted

  // Show success messages
  useEffect(() => {
    if (isDeposited) {
      toast.success('Deposit successful! 🎉')
      setAmount('')
    }
  }, [isDeposited])

  useEffect(() => {
    if (isWithdrawn) {
      toast.success('Withdrawal successful! 💰')
      setAmount('')
    }
  }, [isWithdrawn])

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    const amountBigInt = parseUnits(amount, tokenInfo.decimals)

    if (mode === 'deposit') {
      // Check allowance
      const currentAllowance = allowance as bigint || BigInt(0)
      if (currentAllowance < amountBigInt) {
        toast.info('Approving tokens...')
        await approve(CONTRACTS[selectedToken], amountBigInt)
        return
      }
      await deposit(CONTRACTS[selectedToken], amountBigInt)
    } else {
      await withdraw(CONTRACTS[selectedToken], amountBigInt)
    }
  }

  const setMaxAmount = () => {
    const max = mode === 'deposit' ? walletBalance : vaultBalance
    setAmount(max)
  }

  if (!isConnected) {
    return (
      <div className="vault-panel">
        <div className="vault-header">
          <span className="vault-icon">🏦</span>
          <h3>Trading Vault</h3>
        </div>
        <div className="vault-connect">
          <p>Connect wallet to deposit/withdraw tokens</p>
        </div>
      </div>
    )
  }

  return (
    <div className="vault-panel">
      <div className="vault-header">
        <span className="vault-icon">🏦</span>
        <h3>Trading Vault</h3>
      </div>

      <p className="vault-desc">
        Deposit tokens to the vault for trading. Withdraw anytime.
      </p>

      {/* Mode Toggle */}
      <div className="vault-mode-toggle">
        <button
          className={mode === 'deposit' ? 'active' : ''}
          onClick={() => setMode('deposit')}
        >
          Deposit
        </button>
        <button
          className={mode === 'withdraw' ? 'active' : ''}
          onClick={() => setMode('withdraw')}
        >
          Withdraw
        </button>
      </div>

      {/* Token Select */}
      <div className="vault-token-select">
        {(['FETH', 'FUSDT', 'FBTC'] as TokenKey[]).map((token) => (
          <button
            key={token}
            className={selectedToken === token ? 'active' : ''}
            onClick={() => setSelectedToken(token)}
          >
            <span>{TOKENS[token].icon}</span>
            <span>{token}</span>
          </button>
        ))}
      </div>

      {/* Balances */}
      <div className="vault-balances">
        <div className="balance-row">
          <span>Wallet</span>
          <span>{parseFloat(walletBalance).toFixed(4)} {selectedToken}</span>
        </div>
        <div className="balance-row">
          <span>Vault</span>
          <span>{parseFloat(vaultBalance).toFixed(4)} {selectedToken}</span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="vault-input">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <button className="max-btn" onClick={setMaxAmount}>
          MAX
        </button>
      </div>

      {/* Action Button */}
      <button
        className={`vault-action-btn ${mode}`}
        onClick={handleAction}
        disabled={isDepositing || isWithdrawing || isApproving || !amount}
      >
        {isApproving
          ? 'Approving...'
          : isDepositing
          ? 'Depositing...'
          : isWithdrawing
          ? 'Withdrawing...'
          : mode === 'deposit'
          ? `Deposit ${selectedToken}`
          : `Withdraw ${selectedToken}`}
      </button>

      {/* Info */}
      <div className="vault-info">
        <p>💡 Deposited tokens can be used for trading on the DEX.</p>
      </div>
    </div>
  )
}
