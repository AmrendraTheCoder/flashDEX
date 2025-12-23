import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { useOnChainOrderBook, useOrderBookStats } from '../hooks/useOrderBook'

export function OrderBook() {
  const { currentPair, bids, asks } = useOrderBookStore()
  const { useOnChain, toggleOnChain } = useUIStore()
  
  // On-chain data
  const { bids: onChainBids, asks: onChainAsks, isLoading } = useOnChainOrderBook(12)
  const { lastPrice } = useOrderBookStats()
  
  // Off-chain data
  const offChainBids = bids.get(currentPair.symbol) || []
  const offChainAsks = asks.get(currentPair.symbol) || []
  
  // Use on-chain or off-chain based on global toggle
  const currentBids = useOnChain 
    ? onChainBids.map((b, i) => ({ id: `bid-${i}`, price: b.price, amount: b.amount }))
    : offChainBids
  const currentAsks = useOnChain 
    ? onChainAsks.map((a, i) => ({ id: `ask-${i}`, price: a.price, amount: a.amount }))
    : offChainAsks
  
  const currentPrice = useOnChain && lastPrice > 0 ? lastPrice : currentPair.basePrice

  const maxBidAmount = Math.max(...currentBids.map(b => b.amount), 1)
  const maxAskAmount = Math.max(...currentAsks.map(a => a.amount), 1)

  const spread = currentAsks.length > 0 && currentBids.length > 0
    ? Math.abs((currentAsks[0]?.price || 0) - (currentBids[0]?.price || 0)).toFixed(2)
    : '0.00'

  return (
    <div className="order-book">
      <div className="order-book-title">
        <h3>Order Book</h3>
        <div className="order-book-controls">
          <button 
            className={`mode-toggle-btn ${useOnChain ? 'on-chain' : ''}`}
            onClick={toggleOnChain}
            title={useOnChain ? 'Switch to Fast Mode' : 'Switch to On-Chain Mode'}
          >
            {useOnChain ? 'On-Chain' : 'Fast'}
          </button>
          <span className="spread">Spread: ${spread}</span>
        </div>
      </div>
      
      {useOnChain && isLoading && (
        <div className="loading-indicator">Loading on-chain data...</div>
      )}
      
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
        {currentAsks.length === 0 && !isLoading && (
          <div className="no-orders">{useOnChain ? 'No on-chain asks' : 'No asks'}</div>
        )}
      </div>

      <div className="current-price">
        <span className="price-label">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        {useOnChain && <span className="chain-badge">🔗</span>}
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
        {currentBids.length === 0 && !isLoading && (
          <div className="no-orders">{useOnChain ? 'No on-chain bids' : 'No bids'}</div>
        )}
      </div>
    </div>
  )
}
