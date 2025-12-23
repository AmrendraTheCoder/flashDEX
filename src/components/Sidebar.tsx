import { useUIStore } from '../store/uiStore'
import { useOrderBookStore } from '../store/orderBookStore'
import { useState, useEffect } from 'react'
import { exportTradesToCSV } from '../utils/export'
import { soundManager } from '../utils/sounds'
import { FaucetPanel } from './FaucetPanel'
import { VaultPanel } from './VaultPanel'

export function Sidebar() {
  const { 
    sidebarOpen, sidebarContent, closeSidebar,
    priceAlerts, addPriceAlert, removePriceAlert,
    achievements, slippage, setSlippage,
    soundEnabled, toggleSound, darkMode, toggleDarkMode,
    shortcutsEnabled, toggleShortcuts
  } = useUIStore()
  
  const { currentPair, trades } = useOrderBookStore()
  const currentTrades = trades.get(currentPair.symbol) || []
  
  const [alertPrice, setAlertPrice] = useState('')
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above')
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle open/close animations
  useEffect(() => {
    if (sidebarOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [sidebarOpen])

  const handleClose = () => {
    soundManager.playClick()
    closeSidebar()
  }

  const handleAddAlert = () => {
    if (!alertPrice) return
    addPriceAlert({
      pair: currentPair.symbol,
      price: parseFloat(alertPrice),
      condition: alertCondition
    })
    setAlertPrice('')
    soundManager.playClick()
  }

  if (!isVisible) return null

  const getIcon = () => {
    switch (sidebarContent) {
      case 'alerts': return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )
      case 'settings': return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      )
      case 'achievements': return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
      )
      case 'history': return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      )
      case 'wallet': return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
        </svg>
      )
      default: return null
    }
  }

  const getTitle = () => {
    switch (sidebarContent) {
      case 'alerts': return 'Price Alerts'
      case 'settings': return 'Settings'
      case 'achievements': return 'Achievements'
      case 'history': return 'Trade History'
      case 'wallet': return 'Wallet & Faucet'
      default: return ''
    }
  }

  return (
    <>
      <div 
        className={`sidebar-overlay ${isAnimating ? 'visible' : ''}`} 
        onClick={handleClose} 
      />
      <div className={`sidebar ${isAnimating ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <span className="sidebar-icon">{getIcon()}</span>
            <h3>{getTitle()}</h3>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {sidebarContent === 'alerts' && (
            <div className="alerts-panel">
              <div className="add-alert">
                <p className="section-desc">Get notified when price reaches your target</p>
                <div className="alert-inputs">
                  <select 
                    value={alertCondition} 
                    onChange={(e) => setAlertCondition(e.target.value as 'above' | 'below')}
                  >
                    <option value="above">Price Above</option>
                    <option value="below">Price Below</option>
                  </select>
                  <input
                    type="number"
                    placeholder={`e.g. ${(currentPair.basePrice * 1.05).toFixed(0)}`}
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                  />
                </div>
                <button className="add-btn" onClick={handleAddAlert}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Alert for {currentPair.symbol}
                </button>
              </div>
              
              <div className="alerts-list">
                <h4>Active Alerts</h4>
                {priceAlerts.filter(a => !a.triggered).map((alert, i) => (
                  <div key={alert.id} className="alert-item" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="alert-info">
                      <span className="alert-pair">{alert.pair}</span>
                      <span className={`alert-condition ${alert.condition}`}>
                        {alert.condition === 'above' ? '↑ Above' : '↓ Below'} ${alert.price.toLocaleString()}
                      </span>
                    </div>
                    <button className="remove-btn" onClick={() => removePriceAlert(alert.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
                {priceAlerts.filter(a => !a.triggered).length === 0 && (
                  <div className="empty-state-small">No active alerts. Add one above!</div>
                )}
              </div>
            </div>
          )}

          {sidebarContent === 'settings' && (
            <div className="settings-panel">
              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Dark Mode</span>
                  <span className="setting-desc">Switch between light and dark theme</span>
                </div>
                <button className={`toggle ${darkMode ? 'on' : ''}`} onClick={toggleDarkMode}>
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Sound Effects</span>
                  <span className="setting-desc">Play sounds on trades and alerts</span>
                </div>
                <button className={`toggle ${soundEnabled ? 'on' : ''}`} onClick={toggleSound}>
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <span className="setting-label">Keyboard Shortcuts</span>
                  <span className="setting-desc">Enable quick trading hotkeys</span>
                </div>
                <button className={`toggle ${shortcutsEnabled ? 'on' : ''}`} onClick={toggleShortcuts}>
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="setting-item column">
                <div className="setting-info">
                  <span className="setting-label">Slippage Tolerance</span>
                  <span className="setting-desc">Maximum price deviation: {slippage}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value))}
                />
                <div className="range-labels">
                  <span>0.1%</span>
                  <span>5%</span>
                </div>
              </div>

              <div className="shortcuts-info">
                <h4>Keyboard Shortcuts</h4>
                <div className="shortcut"><kbd>1</kbd><span>Trading View</span></div>
                <div className="shortcut"><kbd>2</kbd><span>Portfolio</span></div>
                <div className="shortcut"><kbd>3</kbd><span>Analytics</span></div>
                <div className="shortcut"><kbd>Esc</kbd><span>Close Sidebar</span></div>
              </div>
            </div>
          )}

          {sidebarContent === 'achievements' && (
            <div className="achievements-panel">
              <p className="section-desc">Complete challenges to unlock achievements</p>
              <div className="achievements-grid">
                {achievements.map((achievement, i) => (
                  <div 
                    key={achievement.id} 
                    className={`achievement-item ${achievement.unlocked ? 'unlocked' : ''}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <span className="achievement-icon">{achievement.icon}</span>
                    <div className="achievement-info">
                      <span className="achievement-name">{achievement.name}</span>
                      <span className="achievement-desc">{achievement.description}</span>
                    </div>
                    {achievement.unlocked && (
                      <span className="check">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="achievement-progress">
                <span>{achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${(achievements.filter(a => a.unlocked).length / achievements.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {sidebarContent === 'history' && (
            <div className="history-panel">
              <button 
                className="export-btn"
                onClick={() => {
                  exportTradesToCSV(currentTrades, `trades-${currentPair.symbol}.csv`)
                  soundManager.playClick()
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export to CSV
              </button>
              
              <div className="history-stats">
                <div className="stat">
                  <span className="stat-value">{currentTrades.length}</span>
                  <span className="stat-label">Total Trades</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{currentTrades.filter(t => t.side === 'buy').length}</span>
                  <span className="stat-label">Buys</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{currentTrades.filter(t => t.side === 'sell').length}</span>
                  <span className="stat-label">Sells</span>
                </div>
              </div>
              
              <h4>Recent Trades</h4>
              <div className="history-list">
                {currentTrades.slice(0, 30).map((trade, i) => (
                  <div 
                    key={trade.id} 
                    className={`history-item ${trade.side}`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="history-main">
                      <span className="history-side">{trade.side.toUpperCase()}</span>
                      <span className="history-details">
                        <span className="history-amount">{trade.amount.toFixed(4)}</span>
                        <span className="history-price">@ ${trade.price.toFixed(2)}</span>
                      </span>
                    </div>
                    <span className="history-time">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {currentTrades.length === 0 && (
                  <div className="empty-state-small">No trades yet. Start the simulation!</div>
                )}
              </div>
            </div>
          )}

          {sidebarContent === 'wallet' && (
            <div className="wallet-panel">
              <FaucetPanel />
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <VaultPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}