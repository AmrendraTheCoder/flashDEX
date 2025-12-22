import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { WalletConnect } from './WalletConnect'
import { Toolbar } from './Toolbar'

export function Header() {
  const { pairs, currentPair, setCurrentPair, tps, totalVolume } = useOrderBookStore()
  const { darkMode } = useUIStore()

  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#logo-gradient)"/>
            <path d="M8 16L16 8L24 16L16 24L8 16Z" fill="white" fillOpacity="0.9"/>
            <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="url(#logo-gradient)"/>
            <defs>
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="brand-text">
            <span className="brand-name">FlashDEX</span>
            <span className="brand-tag">by Monad</span>
          </div>
        </div>
      </div>

      <div className="header-pairs">
        {pairs.map(pair => {
          const isActive = currentPair.symbol === pair.symbol
          const priceChange = pair.change24h
          return (
            <button
              key={pair.symbol}
              className={`pair-card ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPair(pair.symbol)}
            >
              <div className="pair-icon">
                {pair.base === 'ETH' && '⟠'}
                {pair.base === 'BTC' && '₿'}
                {pair.base === 'MON' && '◈'}
              </div>
              <div className="pair-info">
                <span className="pair-name">{pair.symbol}</span>
                <span className="pair-price">${pair.basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <span className={`pair-change ${priceChange >= 0 ? 'up' : 'down'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </span>
            </button>
          )
        })}
      </div>

      <div className="header-stats">
        <div className="header-stat">
          <span className="stat-value accent">{tps.toLocaleString()}</span>
          <span className="stat-label">TPS</span>
        </div>
        <div className="header-stat">
          <span className="stat-value">${(totalVolume / 1000000).toFixed(2)}M</span>
          <span className="stat-label">Volume</span>
        </div>
      </div>

      <div className="header-actions">
        <Toolbar />
        <WalletConnect />
      </div>
    </header>
  )
}
