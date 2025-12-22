import { useOrderBookStore } from '../store/orderBookStore'

export function RecentTrades() {
  const { currentPair, trades } = useOrderBookStore()
  const currentTrades = trades.get(currentPair.symbol) || []

  return (
    <div className="recent-trades">
      <h3>Recent Trades</h3>
      
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
        
        {currentTrades.length === 0 && (
          <div className="no-trades">No trades yet</div>
        )}
      </div>
    </div>
  )
}
