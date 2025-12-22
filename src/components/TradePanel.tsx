import { useState } from 'react'
import { useAccount } from 'wagmi'
import type { Order } from '../types'
import { matchingEngine } from '../engine/matchingEngine'
import { useOrderBookStore } from '../store/orderBookStore'

export function TradePanel() {
  const { address, isConnected } = useAccount()
  const { currentPair } = useOrderBookStore()
  const currentPrice = currentPair.basePrice
  const [amount, setAmount] = useState('0.1')
  const [price, setPrice] = useState('')
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleTrade = async (side: 'buy' | 'sell') => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setIsSubmitting(true)
    
    const orderPrice = orderType === 'market' 
      ? (side === 'buy' ? currentPrice * 1.01 : currentPrice * 0.99)
      : parseFloat(price) || currentPrice

    const order: Order = {
      id: matchingEngine.generateOrderId(),
      price: orderPrice,
      amount: parseFloat(amount) || 0.1,
      side,
      timestamp: Date.now(),
      trader: address.slice(0, 8) + '...',
      type: orderType,
      status: 'open',
      filledAmount: 0,
      pair: currentPair.symbol,
    }

    try {
      await matchingEngine.processOrder(order)
    } catch (error) {
      console.error('Order failed:', error)
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="trade-panel">
      <h3>Trade ETH/USDT</h3>
      
      <div className="order-type-tabs">
        <button 
          className={orderType === 'market' ? 'active' : ''} 
          onClick={() => setOrderType('market')}
        >
          Market
        </button>
        <button 
          className={orderType === 'limit' ? 'active' : ''} 
          onClick={() => setOrderType('limit')}
        >
          Limit
        </button>
      </div>

      {orderType === 'limit' && (
        <div className="input-group">
          <label>Price (USDT)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={currentPrice.toFixed(2)}
          />
        </div>
      )}

      <div className="input-group">
        <label>Amount (ETH)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          step="0.01"
          min="0.01"
        />
      </div>

      <div className="quick-amounts">
        {[0.1, 0.5, 1, 5].map(val => (
          <button key={val} onClick={() => setAmount(val.toString())}>
            {val} ETH
          </button>
        ))}
      </div>

      <div className="trade-buttons">
        <button 
          className="buy-btn" 
          onClick={() => handleTrade('buy')}
          disabled={isSubmitting || !isConnected}
        >
          Buy
        </button>
        <button 
          className="sell-btn" 
          onClick={() => handleTrade('sell')}
          disabled={isSubmitting || !isConnected}
        >
          Sell
        </button>
      </div>

      {!isConnected && (
        <p className="connect-hint">Connect wallet to start trading</p>
      )}
    </div>
  )
}
