import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import type { Order, Trade } from '../types'
import { matchingEngine } from '../engine/matchingEngine'
import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { useAllBalances } from '../hooks/useContracts'
import { usePlaceOrder, useUserOrders, useCancelOrder } from '../hooks/useOrderBook'
import { soundManager } from '../utils/sounds'
import { fireBigTradeConfetti } from '../utils/confetti'

type OrderType = 'market' | 'limit' | 'stop' | 'tp' | 'trail' | 'oco'

const ORDER_TYPES: { id: OrderType; label: string; desc: string }[] = [
  { id: 'market', label: 'Market', desc: 'Execute at best price' },
  { id: 'limit', label: 'Limit', desc: 'Execute at specific price' },
  { id: 'stop', label: 'Stop', desc: 'Trigger when price falls' },
  { id: 'tp', label: 'Take Profit', desc: 'Trigger when price rises' },
  { id: 'trail', label: 'Trailing', desc: 'Follow price movement' },
  { id: 'oco', label: 'OCO', desc: 'One cancels other' },
]

export function TradingPanel() {
  const { address, isConnected } = useAccount()
  const { 
    currentPair, addUserOrder, setUserPortfolio, userPortfolio,
    addUserTrade, updateUserPosition 
  } = useOrderBookStore()
  const { slippage, unlockAchievement, useOnChain, toggleOnChain } = useUIStore()
  const onChainBalances = useAllBalances()
  
  const { placeOrder, isPlacing, isPlaced } = usePlaceOrder()
  const { orders: userOnChainOrders, refetch: refetchOrders } = useUserOrders()
  const { cancelOrder, isCancelling } = useCancelOrder()
  
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [tpPrice, setTpPrice] = useState('')
  const [trailPercent, setTrailPercent] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentPrice = currentPair.basePrice
  const amountNum = parseFloat(amount) || 0
  const priceNum = parseFloat(price) || currentPrice
  const orderValue = amountNum * (orderType === 'market' ? currentPrice : priceNum)
  const fee = orderValue * 0.001

  // Initialize portfolio when wallet connects - using useEffect to avoid setState during render
  useEffect(() => {
    if (isConnected && address && !userPortfolio) {
      setUserPortfolio({
        address, balance: 10000, positions: [], openOrders: [],
        tradeHistory: [], totalPnl: 0, totalVolume: 0, totalTrades: 0,
      })
    }
  }, [isConnected, address, userPortfolio, setUserPortfolio])

  useEffect(() => {
    if (isPlaced) {
      toast.success('On-chain order placed! 🔗')
      refetchOrders()
      setAmount('')
      setPrice('')
    }
  }, [isPlaced, refetchOrders])

  const handleSubmit = async () => {
    if (!isConnected) { toast.error('Connect wallet to trade'); return }
    if (!amountNum || amountNum <= 0) { toast.error('Enter valid amount'); return }
    if (!userPortfolio) return

    setIsSubmitting(true)
    const orderPrice = orderType === 'market' 
      ? currentPrice * (side === 'buy' ? 1 + slippage/100 : 1 - slippage/100)
      : priceNum

    if (useOnChain) {
      try {
        const onChainOrderType = orderType === 'market' ? 1 : 0
        await placeOrder(orderPrice, amountNum, side === 'buy', onChainOrderType)
        side === 'buy' ? soundManager.playBuy() : soundManager.playSell()
      } catch (err) {
        soundManager.playError()
        toast.error('On-chain order failed')
        console.error(err)
      }
      setIsSubmitting(false)
      return
    }

    const order: Order = {
      id: matchingEngine.generateOrderId(),
      price: orderPrice, amount: amountNum, side, timestamp: Date.now(),
      trader: `${address!.slice(0, 6)}...${address!.slice(-4)}`,
      type: orderType === 'tp' ? 'take-profit' : orderType === 'trail' ? 'trailing-stop' : orderType === 'stop' ? 'stop-loss' : orderType,
      stopPrice: ['stop', 'tp', 'oco'].includes(orderType) ? parseFloat(stopPrice) || currentPrice : undefined,
      trailingPercent: orderType === 'trail' ? parseFloat(trailPercent) : undefined,
      status: 'open', filledAmount: 0, pair: currentPair.symbol,
    }

    try {
      addUserOrder(order)
      const trades = await matchingEngine.processOrder(order)
      side === 'buy' ? soundManager.playBuy() : soundManager.playSell()

      if (trades.length > 0) {
        const filled = trades.reduce((s, t) => s + t.amount, 0)
        const avgPrice = trades.reduce((s, t) => s + t.price * t.amount, 0) / filled
        const tradeValue = filled * avgPrice
        
        const userTrade: Trade = {
          id: `user-${Date.now()}`, price: avgPrice, amount: filled, side,
          timestamp: Date.now(), buyer: side === 'buy' ? order.trader : 'Market',
          seller: side === 'sell' ? order.trader : 'Market', pair: currentPair.symbol,
        }
        addUserTrade(userTrade)
        
        const existingPosition = userPortfolio.positions.find(p => p.pair === currentPair.symbol)
        if (existingPosition) {
          const newAmount = side === 'buy' ? existingPosition.amount + filled : existingPosition.amount - filled
          const newEntryPrice = side === 'buy'
            ? (existingPosition.entryPrice * existingPosition.amount + avgPrice * filled) / (existingPosition.amount + filled)
            : existingPosition.entryPrice
          const pnl = (currentPrice - newEntryPrice) * newAmount * (existingPosition.side === 'buy' ? 1 : -1)
          const pnlPercent = (pnl / (newEntryPrice * Math.abs(newAmount))) * 100
          updateUserPosition({ ...existingPosition, amount: Math.abs(newAmount), entryPrice: newEntryPrice, pnl, pnlPercent })
        } else {
          updateUserPosition({ pair: currentPair.symbol, side, amount: filled, entryPrice: avgPrice, currentPrice, pnl: 0, pnlPercent: 0 })
        }
        
        soundManager.playOrderFilled()
        toast.success(`Filled ${filled.toFixed(4)} ${currentPair.base} @ ${avgPrice.toFixed(2)}`)
        if (tradeValue > 500) fireBigTradeConfetti()
        unlockAchievement('first_trade')
        if (userPortfolio.totalVolume + tradeValue > 1000) unlockAchievement('volume_1k')
        if (userPortfolio.totalVolume + tradeValue > 10000) unlockAchievement('volume_10k')
      } else {
        toast.info(`Order placed @ ${orderPrice.toFixed(2)}`)
      }
      setAmount(''); setPrice(''); setStopPrice(''); setTpPrice('')
    } catch (err) {
      soundManager.playError(); toast.error('Order failed'); console.error(err)
    }
    setIsSubmitting(false)
  }

  const handleCancelOrder = async (orderId: number) => {
    await cancelOrder(orderId)
    refetchOrders()
  }

  const setPercentage = (pct: number) => {
    const balance = userPortfolio?.balance || 10000
    const maxAmount = (balance * pct / 100) / currentPrice
    setAmount(maxAmount.toFixed(4))
  }

  return (
    <div className="trading-panel">
      <div className="panel-header">
        <h3>Place Order</h3>
        <div className="header-controls">
          <button 
            className={`chain-toggle ${useOnChain ? 'on-chain' : ''}`}
            onClick={toggleOnChain}
            title={useOnChain ? 'On-chain orders (slower, permanent)' : 'Off-chain orders (fast, simulated)'}
          >
            {useOnChain ? '🔗 On-Chain' : '⚡ Fast'}
          </button>
          <span className="live-price">${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="side-toggle">
        <button className={`side-btn buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>Buy</button>
        <button className={`side-btn sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>Sell</button>
      </div>

      <div className="order-types">
        {ORDER_TYPES.filter(t => !useOnChain || ['market', 'limit'].includes(t.id)).map(type => (
          <button key={type.id} className={`type-btn ${orderType === type.id ? 'active' : ''}`}
            onClick={() => setOrderType(type.id)} title={type.desc}>{type.label}</button>
        ))}
      </div>

      <div className="order-inputs">
        {orderType !== 'market' && (
          <div className="input-field">
            <label>Price</label>
            <div className="input-wrapper">
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={currentPrice.toFixed(2)} />
              <span className="unit">USDT</span>
            </div>
          </div>
        )}

        {!useOnChain && ['stop', 'oco'].includes(orderType) && (
          <div className="input-field">
            <label>Stop Price</label>
            <div className="input-wrapper">
              <input type="number" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder={(currentPrice * 0.95).toFixed(2)} />
              <span className="unit">USDT</span>
            </div>
          </div>
        )}

        {!useOnChain && ['tp', 'oco'].includes(orderType) && (
          <div className="input-field">
            <label>Take Profit</label>
            <div className="input-wrapper">
              <input type="number" value={tpPrice} onChange={e => setTpPrice(e.target.value)} placeholder={(currentPrice * 1.05).toFixed(2)} />
              <span className="unit">USDT</span>
            </div>
          </div>
        )}

        {!useOnChain && orderType === 'trail' && (
          <div className="input-field">
            <label>Trail Distance</label>
            <div className="input-wrapper">
              <input type="number" value={trailPercent} onChange={e => setTrailPercent(e.target.value)} min="0.1" max="10" step="0.1" />
              <span className="unit">%</span>
            </div>
          </div>
        )}

        <div className="input-field">
          <label>Amount</label>
          <div className="input-wrapper">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            <span className="unit">{currentPair.base}</span>
          </div>
        </div>

        <div className="percent-btns">
          {[25, 50, 75, 100].map(pct => (<button key={pct} onClick={() => setPercentage(pct)}>{pct}%</button>))}
        </div>
      </div>

      <div className="order-summary">
        <div className="summary-line"><span>Order Value</span><span>${orderValue.toFixed(2)}</span></div>
        <div className="summary-line"><span>Fee (0.1%)</span><span>${fee.toFixed(2)}</span></div>
        <div className="summary-line total"><span>Total</span><span>${(orderValue + fee).toFixed(2)}</span></div>
      </div>

      <button className={`submit-btn ${side}`} onClick={handleSubmit}
        disabled={isSubmitting || isPlacing || !isConnected || !amountNum}>
        {!isConnected ? 'Connect Wallet' : isSubmitting || isPlacing ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${currentPair.base}`}
      </button>

      {isConnected && (
        <div className="wallet-balances">
          <h4>💰 On-Chain Balances</h4>
          <div className="balance-row"><span>⟠ FETH</span><span>{parseFloat(onChainBalances.FETH.walletFormatted).toFixed(4)}</span></div>
          <div className="balance-row"><span>💵 FUSDT</span><span>{parseFloat(onChainBalances.FUSDT.walletFormatted).toLocaleString()}</span></div>
          <div className="balance-row"><span>₿ FBTC</span><span>{parseFloat(onChainBalances.FBTC.walletFormatted).toFixed(4)}</span></div>
        </div>
      )}

      {useOnChain && userOnChainOrders.length > 0 && (
        <div className="on-chain-orders">
          <h4>🔗 Your On-Chain Orders</h4>
          {userOnChainOrders.filter(o => o.status === 'open' || o.status === 'partial').map(order => (
            <div key={order.id} className={`order-item ${order.isBuy ? 'buy' : 'sell'}`}>
              <span>{order.isBuy ? 'BUY' : 'SELL'} @ ${order.price.toFixed(2)}</span>
              <span>{order.amount.toFixed(4)}</span>
              <button onClick={() => handleCancelOrder(order.id)} disabled={isCancelling}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
