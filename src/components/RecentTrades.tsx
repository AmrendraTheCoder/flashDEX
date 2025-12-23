import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { useOnChainTrades } from '../hooks/useOrderBook'

export function RecentTrades() {
  const { currentPair, trades } = useOrderBookStore()
  const { useOnChain, toggleOnChain } = useUIStore()
  
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
  
  const currentTrades = useOnChain ? formattedOnChainTrades : offChainTrades

  return (
    <div className="recent-trades">
      <div className="trades-title">
        <h3>Recent Trades</h3>
        <button 
          className={`mode-toggle-btn small ${useOnChain ? 'on-chain' : ''}`}
          onClick={toggleOnChain}
          title={useOnChain ? 'Switch to Fast Mode' : 'Switch to On-Chain Mode'}
        >
          {useOnChain ? '🔗' : '⚡'}
        </button>
      </div>
      
      {useOnChain && isLoading && (
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
            {useOnChain ? 'No on-chain trades yet' : 'No trades yet'}
          </div>
        )}
      </div>
    </div>
  )
}
