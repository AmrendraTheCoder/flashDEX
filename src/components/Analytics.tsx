import { useOrderBookStore } from '../store/orderBookStore'

export function Analytics() {
  const { analytics, leaderboard, totalVolume, totalOrders, tps, latency } = useOrderBookStore()

  const volumeHistory = analytics.volumeHistory.slice(-24)
  const maxVolume = Math.max(...volumeHistory.map(v => v.volume), 1)

  return (
    <div className="analytics">
      <h3>Market Analytics</h3>

      <div className="analytics-grid">
        <div className="analytics-card">
          <span className="card-label">24h Volume</span>
          <span className="card-value">${(totalVolume / 1000000).toFixed(2)}M</span>
        </div>
        <div className="analytics-card">
          <span className="card-label">Total Orders</span>
          <span className="card-value">{totalOrders.toLocaleString()}</span>
        </div>
        <div className="analytics-card">
          <span className="card-label">Current TPS</span>
          <span className="card-value">{tps.toLocaleString()}</span>
        </div>
        <div className="analytics-card">
          <span className="card-label">Avg Latency</span>
          <span className="card-value">{latency.toFixed(1)}ms</span>
        </div>
      </div>

      <div className="volume-chart">
        <h4>Volume History (Last 24 periods)</h4>
        <div className="volume-bars">
          {volumeHistory.length > 0 ? (
            volumeHistory.map((v, i) => (
              <div 
                key={i} 
                className="volume-bar"
                style={{ height: `${Math.max((v.volume / maxVolume) * 100, 5)}%` }}
                title={`$${v.volume.toFixed(2)}`}
              />
            ))
          ) : (
            Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="volume-bar" style={{ height: '5%', opacity: 0.3 }} />
            ))
          )}
        </div>
        {volumeHistory.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '10px' }}>
            Start simulation to see volume data
          </p>
        )}
      </div>

      <div className="top-traders">
        <h4>Top Traders by P&L</h4>
        {leaderboard.length > 0 ? (
          <div className="traders-list">
            {leaderboard.slice(0, 5).map((trader, i) => (
              <div key={trader.trader} className="trader-row">
                <span className="trader-rank">#{i + 1}</span>
                <span className="trader-name">{trader.trader}</span>
                <span className={`trader-pnl ${trader.pnl >= 0 ? 'positive' : 'negative'}`}>
                  {trader.pnl >= 0 ? '+' : ''}${trader.pnl.toFixed(2)}
                </span>
                <span className="trader-winrate">{trader.winRate || 0}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">Start simulation to see top traders</div>
        )}
      </div>
    </div>
  )
}