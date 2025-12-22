import { useState } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import type { Order } from '../types'
import { matchingEngine } from '../engine/matchingEngine'
import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { soundManager } from '../utils/sounds'
import { fireBigTradeConfetti } from '../utils/confetti'

type OrderType = 'market' | 'limit' | 'stop-loss' | 'take-profit' | 'trailing-stop' | 'oco'

export function AdvancedTradePanel() {
  const { address, isConnected } = useAccount()
  const { currentPair, addUserOrder, setUserPortfolio, userPortfolio } = useOrderBookStore()
  const { slippage, unlockAchievement } = useUIStore()
  const currentPrice = currentPair.basePrice
  
  const [amount, setAmount] = useState('0.1')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [takeProfitPrice, setTakeProfitPrice] = useState('')
  const [trailingPercent, setTrailingPercent] = useState('1')
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isConnected && address && !userPortfolio) {
    setUserPortfolio({
      address,
      balance: 10000,
      positions: [],
      openOrders: [],
      tradeHistory: [],
      totalPnl: 0,
      totalVolume: 0,
      totalTrades: 0,
    })
  }

  const handleTrade = async (side: 'buy' | 'sell') => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    setIsSubmitting(true)
    
    let orderPrice = currentPrice
    if (orderType === 'limit') {
      orderPrice = parseFloat(price) || currentPrice
    } else if (orderType === 'market') {
      const slippageMultiplier = side === 'buy' ? (1 + slippage / 100) : (1 - slippage / 100)
      orderPrice = currentPrice * slippageMultiplier
    }

    const order: Order = {
      id: matchingEngine.generateOrderId(),
      price: orderPrice,
      amount: parseFloat(amount) || 0.1,
      side,
      timestamp: Date.now(),
      trader: address.slice(0, 6) + '...' + address.slice(-4),
      type: orderType === 'oco' ? 'limit' : orderType,
      stopPrice: ['stop-loss', 'take-profit', 'oco'].includes(orderType) 
        ? parseFloat(stopPrice) || currentPrice 
        : undefined,
      trailingPercent: orderType === 'trailing-stop' 
        ? parseFloat(trailingPercent) || 1 
        : undefined,
      status: 'open',
      filledAmount: 0,
      pair: currentPair.symbol,
    }

    try {
      addUserOrder(order)
      const trades = await matchingEngine.processOrder(order)
      
      // Play sound based on side
      if (side === 'buy') {
        soundManager.playBuy()
      } else {
        soundManager.playSell()
      }
      
      if (trades.length > 0) {
        const totalFilled = trades.reduce((sum, t) => sum + t.amount, 0)
        const avgPrice = trades.reduce((sum, t) => sum + t.price * t.amount, 0) / totalFilled
        
        soundManager.playOrderFilled()
        toast.success(`Order filled: ${totalFilled.toFixed(4)} ${currentPair.base} @ $${avgPrice.toFixed(2)}`)
        
        // Big trade confetti
        if (totalFilled * avgPrice > 1000) {
          fireBigTradeConfetti()
        }
        
        // Unlock achievements
        unlockAchievement('first_trade')
        if (userPortfolio && userPortfolio.totalTrades >= 9) {
          unlockAchievement('trades_10')
        }
        if (userPortfolio && userPortfolio.totalTrades >= 99) {
          unlockAchievement('trades_100')
        }
      } else {
        toast.info(`Limit order placed @ $${order.price.toFixed(2)}`)
      }
    } catch (error) {
      console.error('Order failed:', error)
      soundManager.playError()
      toast.error('Order failed')
    }
    
    setIsSubmitting(false)
  }

  const orderTypes: { value: OrderType; label: string }[] = [
    { value: 'market', label: 'Market' },
    { value: 'limit', label: 'Limit' },
    { value: 'stop-loss', label: 'Stop' },
    { value: 'take-profit', label: 'TP' },
    { value: 'trailing-stop', label: 'Trail' },
    { value: 'oco', label: 'OCO' },
  ]

  return (
    <div className="advanced-trade-panel">
      <div className="trade-header">
        <h3>{currentPair.symbol}</h3>
        <span className="current-price">${currentPrice.toLocaleString()}</span>
      </div>
      
      <div className="order-type-selector">
        {orderTypes.map(type => (
          <button
            key={type.value}
            className={orderType === type.value ? 'active' : ''}
            onClick={() => { setOrderType(type.value); soundManager.playClick() }}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="trade-form">
        {orderType === 'limit' && (
          <div className="input-group">
            <label>Price</label>
            <div className="input-with-suffix">
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={currentPrice.toFixed(2)} />
              <span className="suffix">USDT</span>
            </div>
          </div>
        )}

        {['stop-loss', 'take-profit', 'oco'].includes(orderType) && (
          <div className="input-group">
            <label>{orderType === 'oco' ? 'Stop Price' : 'Trigger Price'}</label>
            <div className="input-with-suffix">
              <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder={currentPrice.toFixed(2)} />
              <span className="suffix">USDT</span>
            </div>
          </div>
        )}

        {orderType === 'oco' && (
          <div className="input-group">
            <label>Take Profit Price</label>
            <div className="input-with-suffix">
              <input type="number" value={takeProfitPrice} onChange={(e) => setTakeProfitPrice(e.target.value)} placeholder={(currentPrice * 1.05).toFixed(2)} />
              <span className="suffix">USDT</span>
            </div>
          </div>
        )}

        {orderType === 'trailing-stop' && (
          <div className="input-group">
            <label>Trail Distance</label>
            <div className="input-with-suffix">
              <input type="number" value={trailingPercent} onChange={(e) => setTrailingPercent(e.target.value)} step="0.1" min="0.1" max="10" />
              <span className="suffix">%</span>
            </div>
          </div>
        )}

        <div className="input-group">
          <label>Amount</label>
          <div className="input-with-suffix">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0.01" />
            <span className="suffix">{currentPair.base}</span>
          </div>
        </div>

        <div className="amount-presets">
          {[10, 25, 50, 75, 100].map(pct => (
            <button key={pct} onClick={() => setAmount((1 * pct / 100).toFixed(2))}>{pct}%</button>
          ))}
        </div>

        <div className="order-summary">
          <div className="summary-row">
            <span>Value</span>
            <span>${((parseFloat(amount) || 0) * currentPrice).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Fee (0.1%)</span>
            <span>${((parseFloat(amount) || 0) * currentPrice * 0.001).toFixed(2)}</span>
          </div>
        </div>

        <div className="trade-buttons">
          <button className="buy-btn" onClick={() => handleTrade('buy')} disabled={isSubmitting || !isConnected}>
            {isSubmitting ? '...' : 'Buy'}
          </button>
          <button className="sell-btn" onClick={() => handleTrade('sell')} disabled={isSubmitting || !isConnected}>
            {isSubmitting ? '...' : 'Sell'}
          </button>
        </div>

        {!isConnected && <p className="connect-hint">Connect wallet to trade</p>}
      </div>
    </div>
  )
}
