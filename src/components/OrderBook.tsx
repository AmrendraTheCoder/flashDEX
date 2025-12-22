import { useOrderBookStore } from '../store/orderBookStore'

export function OrderBook() {
  const { currentPair, bids, asks } = useOrderBookStore()
  
  const currentBids = bids.get(currentPair.symbol) || []
  const currentAsks = asks.get(currentPair.symbol) || []
  const currentPrice = currentPair.basePrice

  const maxBidAmount = Math.max(...currentBids.map(b => b.amount), 1)
  const maxAskAmount = Math.max(...currentAsks.map(a => a.amount), 1)

  const spread = currentAsks.length > 0 && currentBids.length > 0
    ? ((currentAsks[0]?.price || 0) - (currentBids[0]?.price || 0)).toFixed(2)
    : '0.00'

  return (
    <div className="order-book">
      <div className="order-book-title">
        <h3>Order Book</h3>
        <span className="spread">Spread: ${spread}</span>
      </div>
      
      <div className="book-header">
        <span>Price ({currentPair.quote})</span>
        <span>Amount ({currentPair.base})</span>
        <span>Total</span>
      </div>

      <div className="asks">
        {currentAsks.slice(0, 12).reverse().map((ask) => (
          <div key={ask.id} className="order-row ask">
            <div 
              className="depth-bar ask-bar" 
              style={{ width: `${(ask.amount / maxAskAmount) * 100}%` }} 
            />
            <span className="price">{ask.price.toFixed(2)}</span>
            <span className="amount">{ask.amount.toFixed(4)}</span>
            <span className="total">{(ask.price * ask.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="current-price">
        <span className="price-label">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div className="bids">
        {currentBids.slice(0, 12).map((bid) => (
          <div key={bid.id} className="order-row bid">
            <div 
              className="depth-bar bid-bar" 
              style={{ width: `${(bid.amount / maxBidAmount) * 100}%` }} 
            />
            <span className="price">{bid.price.toFixed(2)}</span>
            <span className="amount">{bid.amount.toFixed(4)}</span>
            <span className="total">{(bid.price * bid.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
