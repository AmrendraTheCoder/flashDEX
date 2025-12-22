import { useState, useEffect } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useAccount } from 'wagmi'

type Tab = 'overview' | 'positions' | 'orders' | 'history'

export function Portfolio() {
  const { address, isConnected } = useAccount()
  const { userPortfolio, currentPair, trades } = useOrderBookStore()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  
  const currentTrades = trades.get(currentPair.symbol) || []
  const positions = userPortfolio?.positions || []
  const openOrders = userPortfolio?.openOrders.filter(o => o.status === 'open') || []
  const tradeHistory = userPortfolio?.tradeHistory || []
  
  // Calculate real-time P&L for positions
  const [livePnl, setLivePnl] = useState(0)
  
  useEffect(() => {
    if (positions.length === 0) return
    const pnl = positions.reduce((sum, pos) => {
      const currentPrice = currentPair.basePrice
      const positionPnl = (currentPrice - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
      return sum + positionPnl
    }, 0)
    setLivePnl(pnl)
  }, [positions, currentPair.basePrice])

  return (
    <div className="portfolio">
      <div className="portfolio-header">
        <h3>Portfolio</h3>
        {isConnected && (
          <div className="portfolio-summary">
            <div className="summary-card">
              <span className="summary-label">Balance</span>
              <span className="summary-value">${(userPortfolio?.balance || 10000).toLocaleString()}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Unrealized P&L</span>
              <span className={`summary-value ${livePnl >= 0 ? 'positive' : 'negative'}`}>
                {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Volume</span>
              <span className="summary-value">${((userPortfolio?.totalVolume || 0)).toFixed(0)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Trades</span>
              <span className="summary-value">{userPortfolio?.totalTrades || 0}</span>
            </div>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="portfolio-empty">
          <div className="empty-icon">👛</div>
          <h4>Connect Your Wallet</h4>
          <p>Connect your wallet to start trading and track your portfolio performance.</p>
        </div>
      ) : (
        <>
          <div className="portfolio-nav">
            <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              Overview
            </button>
            <button className={activeTab === 'positions' ? 'active' : ''} onClick={() => setActiveTab('positions')}>
              Positions ({positions.length})
            </button>
            <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
              Orders ({openOrders.length})
            </button>
            <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
              History
            </button>
          </div>

          <div className="portfolio-content">
            {activeTab === 'overview' && (
              <div className="tab-content overview-tab">
                <div className="overview-stats">
                  <div className="stat-card large">
                    <span className="stat-icon">💰</span>
                    <div className="stat-info">
                      <span className="stat-label">Total P&L</span>
                      <span className={`stat-value ${(userPortfolio?.totalPnl || 0) + livePnl >= 0 ? 'positive' : 'negative'}`}>
                        {(userPortfolio?.totalPnl || 0) + livePnl >= 0 ? '+' : ''}
                        ${((userPortfolio?.totalPnl || 0) + livePnl).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">📊</span>
                    <div className="stat-info">
                      <span className="stat-label">Win Rate</span>
                      <span className="stat-value">
                        {tradeHistory.length > 0 
                          ? `${Math.round((tradeHistory.filter(t => t.side === 'buy').length / tradeHistory.length) * 100)}%`
                          : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">⚡</span>
                    <div className="stat-info">
                      <span className="stat-label">Avg Trade</span>
                      <span className="stat-value">
                        ${tradeHistory.length > 0 
                          ? (tradeHistory.reduce((s, t) => s + t.price * t.amount, 0) / tradeHistory.length).toFixed(0)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {positions.length > 0 && (
                  <div className="overview-section">
                    <h4>Active Positions</h4>
                    {positions.slice(0, 3).map((pos, i) => (
                      <div key={i} className="mini-position">
                        <div className="mini-pos-info">
                          <span className={`mini-side ${pos.side}`}>{pos.side.toUpperCase()}</span>
                          <span className="mini-pair">{pos.pair}</span>
                          <span className="mini-amount">{pos.amount.toFixed(4)}</span>
                        </div>
                        <span className={`mini-pnl ${pos.pnl >= 0 ? 'positive' : 'negative'}`}>
                          {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {tradeHistory.length > 0 && (
                  <div className="overview-section">
                    <h4>Recent Activity</h4>
                    {tradeHistory.slice(0, 5).map((trade, i) => (
                      <div key={i} className="mini-trade">
                        <span className={`mini-side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                        <span className="mini-details">{trade.amount.toFixed(4)} @ ${trade.price.toFixed(2)}</span>
                        <span className="mini-time">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {positions.length === 0 && tradeHistory.length === 0 && (
                  <div className="empty-state">
                    <p>No trading activity yet. Place your first trade to see your portfolio stats!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="tab-content">
                {positions.length > 0 ? (
                  <div className="positions-list">
                    {positions.map((pos, i) => {
                      const currentPrice = currentPair.symbol === pos.pair ? currentPair.basePrice : pos.entryPrice
                      const unrealizedPnl = (currentPrice - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
                      const pnlPercent = (unrealizedPnl / (pos.entryPrice * pos.amount)) * 100
                      
                      return (
                        <div key={i} className="position-item">
                          <div className="position-header">
                            <div className="position-info">
                              <span className="position-pair">{pos.pair}</span>
                              <span className={`position-side ${pos.side}`}>{pos.side.toUpperCase()}</span>
                            </div>
                            <span className={`position-pnl ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                              {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="position-details">
                            <div className="detail">
                              <span className="label">Size</span>
                              <span className="value">{pos.amount.toFixed(4)}</span>
                            </div>
                            <div className="detail">
                              <span className="label">Entry</span>
                              <span className="value">${pos.entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="detail">
                              <span className="label">Current</span>
                              <span className="value">${currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="detail">
                              <span className="label">Value</span>
                              <span className="value">${(pos.amount * currentPrice).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state">No open positions. Start trading to see your positions here.</div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="tab-content">
                {openOrders.length > 0 ? (
                  <div className="orders-list">
                    {openOrders.map((order, i) => (
                      <div key={i} className="order-item">
                        <div className="order-header">
                          <div className="order-info">
                            <span className={`order-side ${order.side}`}>{order.side.toUpperCase()}</span>
                            <span className="order-type">{order.type}</span>
                            <span className="order-pair">{order.pair}</span>
                          </div>
                        </div>
                        <div className="order-details">
                          <span className="order-amount">{order.amount.toFixed(4)} @ ${order.price.toFixed(2)}</span>
                          {order.stopPrice && <span className="stop-price">Stop: ${order.stopPrice.toFixed(2)}</span>}
                        </div>
                        <button className="cancel-btn">Cancel</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No open orders. Place a limit order to see it here.</div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-content">
                {tradeHistory.length > 0 ? (
                  <div className="history-list">
                    {tradeHistory.map((trade, i) => (
                      <div key={i} className="trade-item">
                        <span className={`trade-side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                        <span className="trade-amount">{trade.amount.toFixed(4)}</span>
                        <span className="trade-price">@ ${trade.price.toFixed(2)}</span>
                        <span className="trade-value">${(trade.amount * trade.price).toFixed(2)}</span>
                        <span className="trade-time">{new Date(trade.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No trade history yet. Execute trades to see your history.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}