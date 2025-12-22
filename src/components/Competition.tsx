import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { toast } from 'sonner'
import { useCompetitionStore } from '../store/competitionStore'
import { useOrderBookStore } from '../store/orderBookStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { soundManager } from '../utils/sounds'

export function Competition() {
  const { address, isConnected } = useAccount()
  const { userPortfolio } = useOrderBookStore()
  const {
    activeCompetition, isJoined, competitors,
    startCompetition, joinCompetition, updateCompetitor, simulateUsers
  } = useCompetitionStore()
  
  const { 
    isConnected: wsConnected, 
    connectedUsers, 
    liveLeaderboard, 
    liveTrades,
    identify,
    updatePnl 
  } = useWebSocket()
  
  const [duration, setDuration] = useState(5)
  const [timeLeft, setTimeLeft] = useState(0)
  const [hasStartedSim, setHasStartedSim] = useState(false)

  // Identify user when wallet connects
  useEffect(() => {
    if (isConnected && address && wsConnected) {
      identify(address, `${address.slice(0, 6)}...${address.slice(-4)}`)
    }
  }, [isConnected, address, wsConnected, identify])

  // Sync portfolio to WebSocket
  useEffect(() => {
    if (userPortfolio && wsConnected) {
      updatePnl(userPortfolio.totalPnl, userPortfolio.totalTrades, userPortfolio.totalVolume)
    }
  }, [userPortfolio?.totalPnl, userPortfolio?.totalTrades, wsConnected, updatePnl, userPortfolio])

  // Start user simulation once (fallback if WS not connected)
  useEffect(() => {
    if (!hasStartedSim && activeCompetition?.status === 'active' && !wsConnected) {
      simulateUsers()
      setHasStartedSim(true)
    }
  }, [activeCompetition?.status, hasStartedSim, simulateUsers, wsConnected])

  // Update timer
  useEffect(() => {
    if (!activeCompetition || activeCompetition.status !== 'active') return
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, activeCompetition.endTime - Date.now())
      setTimeLeft(remaining)
      if (remaining === 0) {
        toast.success('Competition ended! Check the results.')
        soundManager.playAchievement()
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [activeCompetition])

  // Update user's competition stats
  useEffect(() => {
    if (!isJoined || !address || !userPortfolio) return
    updateCompetitor(
      address,
      userPortfolio.totalPnl,
      userPortfolio.totalTrades,
      userPortfolio.totalVolume
    )
  }, [userPortfolio?.totalPnl, userPortfolio?.totalTrades, isJoined, address, updateCompetitor, userPortfolio])

  const handleStart = () => {
    startCompetition(duration)
    toast.success(`Competition started! ${duration} minutes to trade.`)
    soundManager.playClick()
  }

  const handleJoin = () => {
    if (!isConnected || !address) {
      toast.error('Connect wallet to join')
      return
    }
    const name = `${address.slice(0, 6)}...${address.slice(-4)}`
    joinCompetition(address, name)
    toast.success('Joined competition!')
    soundManager.playBuy()
  }

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000)
    const secs = Math.floor((ms % 60000) / 1000)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Use WebSocket leaderboard if available, otherwise local
  const displayLeaderboard = wsConnected && liveLeaderboard.length > 0 
    ? liveLeaderboard 
    : competitors
  
  const displayTrades = wsConnected && liveTrades.length > 0
    ? liveTrades.map(t => ({ trader: t.trader, action: t.side, amount: t.amount, time: t.timestamp }))
    : []

  const userRank = displayLeaderboard.findIndex(c => 
    c.address === address || c.name?.includes(address?.slice(0, 6) || '')
  ) + 1

  return (
    <div className="competition">
      <div className="competition-header">
        <h3>Trading Competition</h3>
        <div className="live-indicator">
          <span className={`live-dot ${wsConnected ? 'connected' : ''}`} />
          <span>{connectedUsers} online</span>
          {wsConnected && <span className="ws-badge">Live</span>}
        </div>
      </div>

      {!activeCompetition && (
        <div className="competition-setup">
          <p className="comp-desc">
            Start a timed trading challenge. Compete against {wsConnected ? 'real traders' : 'bots'} for the highest P&L!
          </p>
          <div className="duration-select">
            <label>Duration</label>
            <div className="duration-options">
              {[2, 5, 10, 15].map(d => (
                <button
                  key={d}
                  className={duration === d ? 'active' : ''}
                  onClick={() => setDuration(d)}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
          <button className="start-comp-btn" onClick={handleStart}>
            Start Competition
          </button>
        </div>
      )}

      {activeCompetition?.status === 'active' && (
        <>
          <div className="competition-timer">
            <div className="timer-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" className="timer-bg" />
                <circle
                  cx="50" cy="50" r="45"
                  className="timer-progress"
                  style={{
                    strokeDasharray: 283,
                    strokeDashoffset: 283 * (1 - timeLeft / (duration * 60000))
                  }}
                />
              </svg>
              <div className="timer-text">
                <span className="timer-value">{formatTime(timeLeft)}</span>
                <span className="timer-label">remaining</span>
              </div>
            </div>
          </div>

          {!isJoined ? (
            <button className="join-btn" onClick={handleJoin}>
              Join Competition
            </button>
          ) : (
            <div className="your-rank">
              <span className="rank-label">Your Rank</span>
              <span className="rank-value">#{userRank || '-'}</span>
              <span className="rank-pnl">
                {(userPortfolio?.totalPnl || 0) >= 0 ? '+' : ''}
                ${(userPortfolio?.totalPnl || 0).toFixed(2)}
              </span>
            </div>
          )}

          <div className="leaderboard-mini">
            <h4>Live Leaderboard</h4>
            {displayLeaderboard.slice(0, 5).map((c: any, i: number) => (
              <div key={c.address || c.id || i} className={`leader-row ${c.address === address ? 'you' : ''}`}>
                <span className="leader-rank">#{i + 1}</span>
                <span className="leader-name">{c.name}</span>
                <span className={`leader-pnl ${c.pnl >= 0 ? 'positive' : 'negative'}`}>
                  {c.pnl >= 0 ? '+' : ''}${c.pnl.toFixed(0)}
                </span>
              </div>
            ))}
            {displayLeaderboard.length === 0 && (
              <div className="empty-mini">Waiting for traders...</div>
            )}
          </div>

          <div className="live-feed">
            <h4>Live Activity</h4>
            <div className="feed-list">
              {(displayTrades.length > 0 ? displayTrades : liveTrades).slice(0, 5).map((a: any, i: number) => (
                <div key={i} className="feed-item" style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="feed-trader">{a.trader}</span>
                  <span className="feed-action">{a.action || a.side}</span>
                  <span className="feed-amount">{a.amount?.toFixed(3)} ETH</span>
                </div>
              ))}
              {displayTrades.length === 0 && liveTrades.length === 0 && (
                <div className="empty-mini">No activity yet</div>
              )}
            </div>
          </div>
        </>
      )}

      {activeCompetition?.status === 'ended' && (
        <div className="competition-results">
          <h4>Competition Ended!</h4>
          <div className="winner-podium">
            {displayLeaderboard.slice(0, 3).map((c: any, i: number) => (
              <div key={c.address || i} className={`podium-place place-${i + 1}`}>
                <span className="podium-medal">{['🥇', '🥈', '🥉'][i]}</span>
                <span className="podium-name">{c.name}</span>
                <span className="podium-pnl">${c.pnl?.toFixed(0) || 0}</span>
              </div>
            ))}
          </div>
          <button className="new-comp-btn" onClick={() => useCompetitionStore.setState({ activeCompetition: null })}>
            New Competition
          </button>
        </div>
      )}
    </div>
  )
}