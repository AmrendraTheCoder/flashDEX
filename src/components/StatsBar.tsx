import { useOrderBookStore } from '../store/orderBookStore'

export function StatsBar() {
  const { tps, totalVolume, totalOrders, currentPair, latency } = useOrderBookStore()

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-label">TPS</span>
        <span className="stat-value tps">{tps.toLocaleString()}</span>
      </div>
      
      <div className="stat">
        <span className="stat-label">24h Volume</span>
        <span className="stat-value">${(totalVolume / 1000000).toFixed(2)}M</span>
      </div>
      
      <div className="stat">
        <span className="stat-label">Orders</span>
        <span className="stat-value">{totalOrders.toLocaleString()}</span>
      </div>
      
      <div className="stat">
        <span className="stat-label">{currentPair.base} Price</span>
        <span className="stat-value">${currentPair.basePrice.toLocaleString()}</span>
      </div>

      <div className="stat">
        <span className="stat-label">Latency</span>
        <span className="stat-value">{latency.toFixed(2)}ms</span>
      </div>
      
      <div className="stat monad-badge">
        <span className="stat-label">Network</span>
        <span className="stat-value">Monad Testnet</span>
      </div>
    </div>
  )
}
