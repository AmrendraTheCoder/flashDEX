import { useState } from 'react'
import { tradingBots } from '../engine/tradingBots'

export function BotControls() {
  const [isRunning, setIsRunning] = useState(false)
  const [orderRate, setOrderRate] = useState(100)

  const toggleBots = () => {
    if (isRunning) {
      tradingBots.stop()
    } else {
      tradingBots.start(orderRate)
    }
    setIsRunning(!isRunning)
  }

  const handleRateChange = (rate: number) => {
    setOrderRate(rate)
    if (isRunning) {
      tradingBots.setOrderRate(rate)
    }
  }

  return (
    <div className="bot-controls">
      <h3>Market Simulation</h3>
      
      <div className="bot-status">
        <span className={`status-indicator ${isRunning ? 'running' : 'stopped'}`} />
        <span>{isRunning ? 'Active' : 'Inactive'}</span>
      </div>

      <div className="rate-control">
        <label>Orders/sec: {orderRate}</label>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={orderRate}
          onChange={(e) => handleRateChange(parseInt(e.target.value))}
        />
      </div>

      <div className="preset-rates">
        {[50, 100, 500, 1000].map(rate => (
          <button 
            key={rate} 
            onClick={() => handleRateChange(rate)}
            className={orderRate === rate ? 'active' : ''}
          >
            {rate}/s
          </button>
        ))}
      </div>

      <button 
        className={`toggle-btn ${isRunning ? 'stop' : 'start'}`}
        onClick={toggleBots}
      >
        {isRunning ? 'Stop' : 'Start'} Simulation
      </button>
    </div>
  )
}
