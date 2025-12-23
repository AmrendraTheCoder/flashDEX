import { useState } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useOnChainOrderBook, useOrderBookStats } from '../hooks/useOrderBook'

export function OrderBook() {
  const { currentPair, bids, asks } = useOrderBookStore()
  const [showOnChain, setShowOnChain] = useState(false)
  
  // On-chain data
  const { bids: onChainBids, asks: onChainAsks, isLoading } = useOnChainOrderBook(12)
  const { lastPrice } = useOrderBookStats()
  
  // Off-chain data
  const offChainBids = bids.get(currentPair.symbol) || []
  const offChainAsks = asks.get(currentPair.symbol) || []
  
  // Use on-chain or off-chain based on toggle
  const currentBids = showOnChain 
    ? onChainBids.map((b, i) => ({ id: `bid-${i}`, price: b.price, amount: b.amount }))
    : offChainBids
  const currentAsks = showOnChain 
    ? onChainAsks.map((a, i) => ({ id: `ask-${i}`, price: a.price, amount: a.amount }))
    : offChainAsks
  
  const currentPrice = showOnChain && lastPrice > 0 ? lastPrice : currentPair.basePrice

  const maxBidAmount = Math.max(...currentBids.map(b => b.amount), 1)
  const maxAskAmount = Math.max(...currentAsks.map(a => a.amount), 1)

  const spread = currentAsks.length > 0 && currentBids.length > 0
    ? ((currentAsks[0]?.price || 0) - (currentBids[0]?.price || 0)).toFixed(2)
    : '0.00'

  return (
    <div className="order-book">
      <div className="order-book-title">
        <h3>Order Book</h3>
        <div className="order-book-controls">
          <button 
            className={`source-toggle ${showOnChain ? 'on-chain' : ''}`}
            onClick={() => setShowOnChain(!showOnChain)}
            title={showOnChain ? 'Showing on-chain data' : 'Showing off-chain data'}
          >
            {showOnChain ? '🔗' : '⚡'}
          </button>
          <span className="spread">Spread: ${spread}</span>
        </div>
      </div>
      
      {showOnChain && isLoading && (
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
        {showOnChain && currentAsks.length === 0 && !isLoading && (
          <div className="no-orders">No on-chain asks</div>
        )}
      </div>

      <div className="current-price">
        <span className="price-label">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        {showOnChain && <span className="chain-badge">🔗</span>}
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
        {showOnChain && currentBids.length === 0 && !isLoading && (
          <div className="no-orders">No on-chain bids</div>
        )}
      </div>
    </div>
  )
}
