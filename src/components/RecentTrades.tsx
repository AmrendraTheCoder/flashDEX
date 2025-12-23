import { useState } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useOnChainTrades } from '../hooks/useOrderBook'

export function RecentTrades() {
  const { currentPair, trades } = useOrderBookStore()
  const [showOnChain, setShowOnChain] = useState(false)
  
  // On-chain trades
  const { trades: onChainTrades, isLoading } = useOnChainTrades(20)
  
  // Off-chain trades
  const offChainTrades = trades.get(currentPair.symbol) || []
  
  // Format on-chain trades to match off-chain format
  const formattedOnChainTrades = onChainTrades.map(t => ({
    id: `chain-${t.id}`,
    price: t.price,
    amount: t.amount,
    timestamp: t.timestamp,
    side: t.buyOrderId > t.sellOrderId ? 'buy' : 'sell' as 'buy' | 'sell',
  }))
  
  const currentTrades = showOnChain ? formattedOnChainTrades : offChainTrades

  return (
    <div className="recent-trades">
      <div className="trades-title">
        <h3>Recent Trades</h3>
        <button 
          className={`source-toggle ${showOnChain ? 'on-chain' : ''}`}
          onClick={() => setShowOnChain(!showOnChain)}
          title={showOnChain ? 'Showing on-chain trades' : 'Showing off-chain trades'}
        >
          {showOnChain ? '🔗' : '⚡'}
        </button>
      </div>
      
      {showOnChain && isLoading && (
        <div className="loading-indicator">Loading...</div>
      )}
      
      <div className="trades-header">
        <span>Price</span>
        <span>Amount</span>
        <span>Time</span>
      </div>

      <div className="trades-list">
        {currentTrades.slice(0, 20).map((trade) => (
          <div key={trade.id} className={`trade-row ${trade.side}`}>
            <span className="price">{trade.price.toFixed(2)}</span>
            <span className="amount">{trade.amount.toFixed(4)}</span>
            <span className="time">
              {new Date(trade.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        
        {currentTrades.length === 0 && !isLoading && (
          <div className="no-trades">
            {showOnChain ? 'No on-chain trades yet' : 'No trades yet'}
          </div>
        )}
      </div>
    </div>
  )
}
