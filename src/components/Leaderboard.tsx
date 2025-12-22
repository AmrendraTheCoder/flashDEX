import { useOrderBookStore } from '../store/orderBookStore'

export function Leaderboard() {
  const { leaderboard } = useOrderBookStore()

  return (
    <div className="leaderboard">
      <h3>Leaderboard</h3>
      
      <div className="leaderboard-header">
        <span>#</span>
        <span>Trader</span>
        <span>P&L</span>
        <span>Win %</span>
      </div>

      <div className="leaderboard-list">
        {leaderboard.map((entry, index) => (
          <div key={entry.trader} className={`leaderboard-row ${index < 3 ? 'top-3' : ''}`}>
            <span className="rank">{index + 1}</span>
            <span className="trader">{entry.trader}</span>
            <span className={`pnl ${entry.pnl >= 0 ? 'positive' : 'negative'}`}>
              {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(0)}
            </span>
            <span className="volume">{entry.winRate || 0}%</span>
          </div>
        ))}
        
        {leaderboard.length === 0 && (
          <div className="no-data">Start trading to see rankings</div>
        )}
      </div>
    </div>
  )
}
