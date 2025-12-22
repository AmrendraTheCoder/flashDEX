import { useState, useMemo } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'

export function TradeCalculator() {
  const { currentPair } = useOrderBookStore()
  const { slippage } = useUIStore()
  
  const [entryPrice, setEntryPrice] = useState(currentPair.basePrice.toString())
  const [amount, setAmount] = useState('1')
  const [leverage, setLeverage] = useState('1')
  const [targetPrice, setTargetPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')

  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice) || 0
    const qty = parseFloat(amount) || 0
    const lev = parseFloat(leverage) || 1
    const target = parseFloat(targetPrice) || 0
    const stop = parseFloat(stopPrice) || 0
    
    const positionValue = entry * qty
    const margin = positionValue / lev
    const fee = positionValue * 0.001 // 0.1% fee
    
    const targetPnL = target ? (target - entry) * qty * lev : 0
    const targetPnLPercent = target && entry ? ((target - entry) / entry) * 100 * lev : 0
    
    const stopPnL = stop ? (stop - entry) * qty * lev : 0
    const stopPnLPercent = stop && entry ? ((stop - entry) / entry) * 100 * lev : 0
    
    const liquidationPrice = entry * (1 - (1 / lev) + 0.005) // 0.5% maintenance margin
    
    const slippageAmount = positionValue * (slippage / 100)
    
    return {
      positionValue,
      margin,
      fee,
      targetPnL,
      targetPnLPercent,
      stopPnL,
      stopPnLPercent,
      liquidationPrice,
      slippageAmount,
      riskReward: targetPnL && stopPnL ? Math.abs(targetPnL / stopPnL) : 0
    }
  }, [entryPrice, amount, leverage, targetPrice, stopPrice, slippage])

  return (
    <div className="trade-calculator">
      <h3>Trade Calculator</h3>
      
      <div className="calc-inputs">
        <div className="calc-row">
          <label>Entry Price</label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
          />
        </div>
        
        <div className="calc-row">
          <label>Amount ({currentPair.base})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        
        <div className="calc-row">
          <label>Leverage</label>
          <div className="leverage-btns">
            {[1, 2, 5, 10, 20].map(l => (
              <button
                key={l}
                className={leverage === l.toString() ? 'active' : ''}
                onClick={() => setLeverage(l.toString())}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>
        
        <div className="calc-row">
          <label>Take Profit</label>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Target price"
          />
        </div>
        
        <div className="calc-row">
          <label>Stop Loss</label>
          <input
            type="number"
            value={stopPrice}
            onChange={(e) => setStopPrice(e.target.value)}
            placeholder="Stop price"
          />
        </div>
      </div>
      
      <div className="calc-results">
        <div className="result-row">
          <span>Position Value</span>
          <span>${calculations.positionValue.toFixed(2)}</span>
        </div>
        <div className="result-row">
          <span>Required Margin</span>
          <span>${calculations.margin.toFixed(2)}</span>
        </div>
        <div className="result-row">
          <span>Est. Fee (0.1%)</span>
          <span>${calculations.fee.toFixed(2)}</span>
        </div>
        <div className="result-row">
          <span>Max Slippage ({slippage}%)</span>
          <span>${calculations.slippageAmount.toFixed(2)}</span>
        </div>
        
        {parseFloat(leverage) > 1 && (
          <div className="result-row warning">
            <span>Liquidation Price</span>
            <span>${calculations.liquidationPrice.toFixed(2)}</span>
          </div>
        )}
        
        {calculations.targetPnL !== 0 && (
          <div className="result-row positive">
            <span>Target P&L</span>
            <span>+${calculations.targetPnL.toFixed(2)} ({calculations.targetPnLPercent.toFixed(1)}%)</span>
          </div>
        )}
        
        {calculations.stopPnL !== 0 && (
          <div className="result-row negative">
            <span>Stop Loss</span>
            <span>${calculations.stopPnL.toFixed(2)} ({calculations.stopPnLPercent.toFixed(1)}%)</span>
          </div>
        )}
        
        {calculations.riskReward > 0 && (
          <div className="result-row">
            <span>Risk/Reward</span>
            <span className={calculations.riskReward >= 2 ? 'positive' : 'warning'}>
              1:{calculations.riskReward.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
