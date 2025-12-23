import { useState, useEffect, useMemo } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useAccount } from 'wagmi'

type Tab = 'overview' | 'positions' | 'orders' | 'history'

export function Portfolio() {
  const { isConnected, address } = useAccount()
  const { userPortfolio, pairs } = useOrderBookStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  
  const positions = userPortfolio?.positions || []
  const openOrders = userPortfolio?.openOrders.filter(o => o.status === 'open') || []
  const tradeHistory = userPortfolio?.tradeHistory || []
  
  // Calculate real-time P&L for positions
  const [livePnl, setLivePnl] = useState(0)
  const [animatedBalance, setAnimatedBalance] = useState(userPortfolio?.balance || 10000)
  
  useEffect(() => {
    if (positions.length === 0) {
      setLivePnl(0)
      return
    }
    const pnl = positions.reduce((sum, pos) => {
      const pair = pairs.find(p => p.symbol === pos.pair)
      const currentPrice = pair?.basePrice || pos.entryPrice
      const positionPnl = (currentPrice - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
      return sum + positionPnl
    }, 0)
    setLivePnl(pnl)
  }, [positions, pairs])

  // Animate balance changes
  useEffect(() => {
    const target = userPortfolio?.balance || 10000
    const diff = target - animatedBalance
    if (Math.abs(diff) < 0.01) return
    const timer = setTimeout(() => {
      setAnimatedBalance(prev => prev + diff * 0.1)
    }, 16)
    return () => clearTimeout(timer)
  }, [userPortfolio?.balance, animatedBalance])

  // Portfolio metrics
  const metrics = useMemo(() => {
    const totalValue = animatedBalance + livePnl
    const totalPnlPercent = animatedBalance > 0 ? ((livePnl / animatedBalance) * 100) : 0
    const winningTrades = tradeHistory.filter((_, i) => i % 3 !== 0).length // Simulated
    const winRate = tradeHistory.length > 0 ? (winningTrades / tradeHistory.length) * 100 : 0
    const avgTradeSize = tradeHistory.length > 0 
      ? tradeHistory.reduce((s, t) => s + t.price * t.amount, 0) / tradeHistory.length 
      : 0
    const largestTrade = tradeHistory.length > 0 
      ? Math.max(...tradeHistory.map(t => t.price * t.amount))
      : 0
    
    return { totalValue, totalPnlPercent, winRate, avgTradeSize, largestTrade }
  }, [animatedBalance, livePnl, tradeHistory])

  // Asset allocation
  const allocation = useMemo(() => {
    if (positions.length === 0) return []
    const total = positions.reduce((s, p) => s + p.amount * p.entryPrice, 0)
    return positions.map(p => ({
      pair: p.pair,
      value: p.amount * p.entryPrice,
      percent: total > 0 ? ((p.amount * p.entryPrice) / total) * 100 : 0,
      side: p.side,
    }))
  }, [positions])

  const formatTime = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="portfolio-container">
      {/* Header */}
      <div className="portfolio-header-section">
        <div className="portfolio-title-row">
          <h2>Portfolio</h2>
          {isConnected && address && (
            <span className="wallet-badge">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="portfolio-empty-state">
          <div className="empty-icon-large">👛</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect your wallet to start trading and track your portfolio performance in real-time.</p>
          <div className="empty-features">
            <div className="feature">📊 Real-time P&L</div>
            <div className="feature">📈 Position Tracking</div>
            <div className="feature">🏆 Leaderboard</div>
          </div>
        </div>
      ) : (
        <>
          {/* Value Cards */}
          <div className="portfolio-value-cards">
            <div className="value-card primary">
              <div className="value-card-header">
                <span className="value-icon">💰</span>
                <span className="value-label">Total Value</span>
              </div>
              <div className="value-amount">${metrics.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className={`value-change ${livePnl >= 0 ? 'positive' : 'negative'}`}>
                {livePnl >= 0 ? '↑' : '↓'} {Math.abs(metrics.totalPnlPercent).toFixed(2)}% today
              </div>
            </div>
            
            <div className="value-card">
              <div className="value-card-header">
                <span className="value-icon">{livePnl >= 0 ? '📈' : '📉'}</span>
                <span className="value-label">Unrealized P&L</span>
              </div>
              <div className={`value-amount ${livePnl >= 0 ? 'positive' : 'negative'}`}>
                {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
              </div>
              <div className="value-subtext">{positions.length} active position{positions.length !== 1 ? 's' : ''}</div>
            </div>
            
            <div className="value-card">
              <div className="value-card-header">
                <span className="value-icon">💵</span>
                <span className="value-label">Available Balance</span>
              </div>
              <div className="value-amount">${animatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="value-subtext">Ready to trade</div>
            </div>
            
            <div className="value-card">
              <div className="value-card-header">
                <span className="value-icon">🎯</span>
                <span className="value-label">Win Rate</span>
              </div>
              <div className="value-amount">{metrics.winRate.toFixed(1)}%</div>
              <div className="value-subtext">{tradeHistory.length} trades total</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="portfolio-tabs">
            {(['overview', 'positions', 'orders', 'history'] as Tab[]).map(tab => (
              <button 
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'overview' && '📊'}
                {tab === 'positions' && '💼'}
                {tab === 'orders' && '📝'}
                {tab === 'history' && '📜'}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                {tab === 'positions' && positions.length > 0 && (
                  <span className="tab-badge">{positions.length}</span>
                )}
                {tab === 'orders' && openOrders.length > 0 && (
                  <span className="tab-badge">{openOrders.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="portfolio-tab-content">
            {activeTab === 'overview' && (
              <div className="overview-content">
                {/* Performance Stats */}
                <div className="stats-section">
                  <h4>Performance Stats</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total P&L</span>
                      <span className={`stat-value ${(userPortfolio?.totalPnl || 0) + livePnl >= 0 ? 'positive' : 'negative'}`}>
                        {(userPortfolio?.totalPnl || 0) + livePnl >= 0 ? '+' : ''}
                        ${((userPortfolio?.totalPnl || 0) + livePnl).toFixed(2)}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total Volume</span>
                      <span className="stat-value">${(userPortfolio?.totalVolume || 0).toFixed(0)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Trade Size</span>
                      <span className="stat-value">${metrics.avgTradeSize.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Largest Trade</span>
                      <span className="stat-value">${metrics.largestTrade.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Asset Allocation */}
                {allocation.length > 0 && (
                  <div className="allocation-section">
                    <h4>Asset Allocation</h4>
                    <div className="allocation-bar">
                      {allocation.map((a, i) => (
                        <div 
                          key={i}
                          className={`allocation-segment ${a.side}`}
                          style={{ width: `${a.percent}%` }}
                          title={`${a.pair}: ${a.percent.toFixed(1)}%`}
                        />
                      ))}
                    </div>
                    <div className="allocation-legend">
                      {allocation.map((a, i) => (
                        <div key={i} className="legend-item">
                          <span className={`legend-dot ${a.side}`} />
                          <span className="legend-pair">{a.pair}</span>
                          <span className="legend-percent">{a.percent.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {tradeHistory.length > 0 && (
                  <div className="recent-activity-section">
                    <h4>Recent Activity</h4>
                    <div className="activity-list">
                      {tradeHistory.slice(0, 5).map((trade, i) => (
                        <div key={i} className="activity-item">
                          <div className={`activity-icon ${trade.side}`}>
                            {trade.side === 'buy' ? '↗' : '↘'}
                          </div>
                          <div className="activity-details">
                            <span className="activity-action">{trade.side.toUpperCase()} {trade.amount.toFixed(4)}</span>
                            <span className="activity-pair">{trade.pair}</span>
                          </div>
                          <div className="activity-meta">
                            <span className="activity-price">@ ${trade.price.toFixed(2)}</span>
                            <span className="activity-time">{formatTime(trade.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {positions.length === 0 && tradeHistory.length === 0 && (
                  <div className="empty-overview">
                    <span className="empty-icon">🚀</span>
                    <p>No trading activity yet. Place your first trade to see your portfolio stats!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="positions-content">
                {positions.length > 0 ? (
                  <div className="positions-grid">
                    {positions.map((pos, i) => {
                      const pair = pairs.find(p => p.symbol === pos.pair)
                      const currentPrice = pair?.basePrice || pos.entryPrice
                      const unrealizedPnl = (currentPrice - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
                      const pnlPercent = (unrealizedPnl / (pos.entryPrice * pos.amount)) * 100
                      const positionValue = pos.amount * currentPrice
                      
                      return (
                        <div key={i} className="position-card">
                          <div className="position-card-header">
                            <div className="position-pair-info">
                              <span className="position-pair">{pos.pair}</span>
                              <span className={`position-side-badge ${pos.side}`}>
                                {pos.side.toUpperCase()}
                              </span>
                            </div>
                            <div className={`position-pnl-badge ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                              {unrealizedPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                          
                          <div className="position-value-row">
                            <span className="position-value">${positionValue.toFixed(2)}</span>
                            <span className={`position-pnl ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                              {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="position-details-grid">
                            <div className="position-detail">
                              <span className="detail-label">Size</span>
                              <span className="detail-value">{pos.amount.toFixed(4)}</span>
                            </div>
                            <div className="position-detail">
                              <span className="detail-label">Entry</span>
                              <span className="detail-value">${pos.entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="position-detail">
                              <span className="detail-label">Current</span>
                              <span className="detail-value">${currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="position-detail">
                              <span className="detail-label">Leverage</span>
                              <span className="detail-value">1x</span>
                            </div>
                          </div>
                          
                          <div className="position-actions">
                            <button className="close-btn">Close Position</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state-card">
                    <span className="empty-icon">💼</span>
                    <h4>No Open Positions</h4>
                    <p>Start trading to build your portfolio</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="orders-content">
                {openOrders.length > 0 ? (
                  <div className="orders-table">
                    <div className="table-header">
                      <span>Pair</span>
                      <span>Type</span>
                      <span>Side</span>
                      <span>Price</span>
                      <span>Amount</span>
                      <span>Action</span>
                    </div>
                    {openOrders.map((order, i) => (
                      <div key={i} className="table-row">
                        <span className="cell-pair">{order.pair}</span>
                        <span className="cell-type">{order.type}</span>
                        <span className={`cell-side ${order.side}`}>{order.side.toUpperCase()}</span>
                        <span className="cell-price">${order.price.toFixed(2)}</span>
                        <span className="cell-amount">{order.amount.toFixed(4)}</span>
                        <button className="cancel-order-btn">Cancel</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-card">
                    <span className="empty-icon">📝</span>
                    <h4>No Open Orders</h4>
                    <p>Place limit orders to see them here</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-content">
                {tradeHistory.length > 0 ? (
                  <div className="history-list">
                    {tradeHistory.map((trade, i) => (
                      <div key={i} className="history-item">
                        <div className="history-item-left">
                          <span className={`history-side ${trade.side}`}>
                            {trade.side === 'buy' ? '↗ BUY' : '↘ SELL'}
                          </span>
                          <span className="history-pair">{trade.pair}</span>
                        </div>
                        <div className="history-item-center">
                          <span className="history-amount">{trade.amount.toFixed(4)}</span>
                          <span className="history-at">@</span>
                          <span className="history-price">${trade.price.toFixed(2)}</span>
                        </div>
                        <div className="history-item-right">
                          <span className="history-value">${(trade.amount * trade.price).toFixed(2)}</span>
                          <span className="history-time">{formatDate(trade.timestamp)} {formatTime(trade.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-card">
                    <span className="empty-icon">📜</span>
                    <h4>No Trade History</h4>
                    <p>Your completed trades will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}