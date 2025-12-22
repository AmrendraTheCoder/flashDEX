import { useState } from 'react'
import { toast } from 'sonner'
import { tradingBots } from '../engine/tradingBots'
import { useOrderBookStore } from '../store/orderBookStore'
import { useUIStore } from '../store/uiStore'
import { fireStressTestConfetti } from '../utils/confetti'
import { soundManager } from '../utils/sounds'

export function StressTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<{ orderCount: number; duration: number; actualTps: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const { tps, totalOrders, latency } = useOrderBookStore()
  const { unlockAchievement } = useUIStore()

  const runStressTest = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults(null)

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 95))
    }, 100)

    try {
      const result = await tradingBots.stressTest(10000)
      setResults(result)
      setProgress(100)
      
      // Celebrate!
      fireStressTestConfetti()
      soundManager.playAchievement()
      unlockAchievement('stress_test')
      
      toast.success(`Stress test complete! ${result.actualTps.toLocaleString()} TPS achieved`, {
        duration: 5000,
      })
    } catch (error) {
      console.error('Stress test failed:', error)
      toast.error('Stress test failed')
    }

    clearInterval(progressInterval)
    setIsRunning(false)
  }

  return (
    <div className="stress-test">
      <div className="stress-header">
        <h3>Performance Test</h3>
        <span className="badge">Demo</span>
      </div>

      <div className="live-metrics">
        <div className="metric">
          <span className="metric-value">{tps.toLocaleString()}</span>
          <span className="metric-label">TPS</span>
        </div>
        <div className="metric">
          <span className="metric-value">{totalOrders.toLocaleString()}</span>
          <span className="metric-label">Orders</span>
        </div>
        <div className="metric">
          <span className="metric-value">{latency.toFixed(1)}ms</span>
          <span className="metric-label">Latency</span>
        </div>
      </div>

      {isRunning && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">Processing 10,000 orders...</span>
        </div>
      )}

      {results && (
        <div className="results">
          <div className="result-item">
            <span className="result-label">Orders Processed</span>
            <span className="result-value">{results.orderCount.toLocaleString()}</span>
          </div>
          <div className="result-item">
            <span className="result-label">Duration</span>
            <span className="result-value">{(results.duration / 1000).toFixed(2)}s</span>
          </div>
          <div className="result-item highlight">
            <span className="result-label">Peak TPS</span>
            <span className="result-value">{results.actualTps.toLocaleString()}</span>
          </div>
        </div>
      )}

      <button className="stress-btn" onClick={runStressTest} disabled={isRunning}>
        {isRunning ? 'Running...' : 'Run 10K Stress Test'}
      </button>

      <p className="stress-info">Demonstrates Monad's high-throughput capability</p>
    </div>
  )
}
