import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { useFaucetStatus, useFaucetClaim, useAllBalances } from '../hooks/useContracts'
import { TOKENS } from '../config/contracts'

/**
 * Faucet panel for claiming testnet tokens
 */
export function FaucetPanel() {
  const { isConnected } = useAccount()
  const { canClaim, timeUntilClaim } = useFaucetStatus()
  const { claim, isClaiming, isClaimed, hash } = useFaucetClaim()
  const balances = useAllBalances()
  
  const [countdown, setCountdown] = useState<string>('')
  
  // Show success toast when claim is confirmed
  useEffect(() => {
    if (isClaimed && hash) {
      toast.success('Tokens claimed successfully! 🎉', {
        description: 'Your wallet has been funded with testnet tokens.',
        duration: 5000,
      })
    }
  }, [isClaimed, hash])
  
  // Format countdown timer
  useEffect(() => {
    if (!timeUntilClaim || timeUntilClaim === BigInt(0)) {
      setCountdown('')
      return
    }
    
    const updateCountdown = () => {
      const seconds = Number(timeUntilClaim)
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      
      setCountdown(`${hours}h ${minutes}m ${secs}s`)
    }
    
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [timeUntilClaim])
  
  const handleClaim = async () => {
    if (!canClaim || isClaiming) return
    await claim()
  }
  
  if (!isConnected) {
    return (
      <div className="faucet-panel">
        <div className="faucet-header">
          <span className="faucet-icon">🚰</span>
          <h3>Testnet Faucet</h3>
        </div>
        <div className="faucet-connect">
          <p>Connect wallet to claim testnet tokens</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="faucet-panel">
      <div className="faucet-header">
        <span className="faucet-icon">🚰</span>
        <h3>Testnet Faucet</h3>
        {isClaimed && <span className="claimed-badge">✓ Claimed</span>}
      </div>
      
      <p className="faucet-desc">
        Claim free testnet tokens once every 24 hours to start trading.
      </p>
      
      <div className="faucet-tokens">
        <div className="faucet-token">
          <span className="token-icon">{TOKENS.FETH.icon}</span>
          <span className="token-name">{TOKENS.FETH.symbol}</span>
          <span className="token-amount">10.0</span>
        </div>
        <div className="faucet-token">
          <span className="token-icon">{TOKENS.FUSDT.icon}</span>
          <span className="token-name">{TOKENS.FUSDT.symbol}</span>
          <span className="token-amount">10,000</span>
        </div>
        <div className="faucet-token">
          <span className="token-icon">{TOKENS.FBTC.icon}</span>
          <span className="token-name">{TOKENS.FBTC.symbol}</span>
          <span className="token-amount">0.5</span>
        </div>
      </div>
      
      {canClaim ? (
        <button 
          className="faucet-btn"
          onClick={handleClaim}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <>
              <span className="spinner" />
              Claiming...
            </>
          ) : (
            <>
              <span>💧</span>
              Claim Tokens
            </>
          )}
        </button>
      ) : (
        <div className="faucet-cooldown">
          <span className="cooldown-icon">⏳</span>
          <div className="cooldown-info">
            <span className="cooldown-label">Next claim available in</span>
            <span className="cooldown-time">{countdown || 'Loading...'}</span>
          </div>
        </div>
      )}
      
      <div className="faucet-balances">
        <h4>Your Wallet Balances</h4>
        <div className="balance-list">
          <div className="balance-item">
            <span>{TOKENS.FETH.icon} {TOKENS.FETH.symbol}</span>
            <span>{balances.FETH.walletFormatted}</span>
          </div>
          <div className="balance-item">
            <span>{TOKENS.FUSDT.icon} {TOKENS.FUSDT.symbol}</span>
            <span>{balances.FUSDT.walletFormatted}</span>
          </div>
          <div className="balance-item">
            <span>{TOKENS.FBTC.icon} {TOKENS.FBTC.symbol}</span>
            <span>{balances.FBTC.walletFormatted}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
