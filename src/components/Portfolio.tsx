import { useState, useMemo } from 'react'
import { useOrderBookStore } from '../store/orderBookStore'
import { useAccount } from 'wagmi'
import { useAllBalances } from '../hooks/useContracts'
import { useUserOrders, useOrderBookStats, useCancelOrder } from '../hooks/useOrderBook'
import { useAllOraclePrices } from '../hooks/useOracle'

type Tab = 'overview' | 'positions' | 'orders' | 'history'

export function Portfolio() {
  const { isConnected, address } = useAccount()
  const { userPortfolio, pairs } = useOrderBookStore()
  const onChainBalances = useAllBalances()
  const { orders: onChainOrders, refetch: refetchOrders } = useUserOrders()
  const { totalTrades: onChainTrades } = useOrderBookStats()
  const { prices: oraclePrices } = useAllOraclePrices()
  const { cancelOrder, isCancelling } = useCancelOrder()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  
  const positions = userPortfolio?.positions || []
  const openOrders = userPortfolio?.openOrders.filter(o => o.status === 'open') || []
  const tradeHistory = userPortfolio?.tradeHistory || []
  
  // Get oracle prices
  const ethPrice = (oraclePrices as Record<string, number>)?.['FETH/FUSDT'] || 2500
  const btcPrice = (oraclePrices as Record<string, number>)?.['FBTC/FUSDT'] || 45000

  // Calculate on-chain portfolio value
  const onChainValue = useMemo(() => {
    const fethWallet = parseFloat(onChainBalances.FETH.walletFormatted) || 0
    const fethVault = parseFloat(onChainBalances.FETH.vaultFormatted) || 0
    const fusdtWallet = parseFloat(onChainBalances.FUSDT.walletFormatted) || 0
    const fusdtVault = parseFloat(onChainBalances.FUSDT.vaultFormatted) || 0
    const fbtcWallet = parseFloat(onChainBalances.FBTC.walletFormatted) || 0
    const fbtcVault = parseFloat(onChainBalances.FBTC.vaultFormatted) || 0

    return {
      feth: { wallet: fethWallet, vault: fethVault, total: fethWallet + fethVault },
      fusdt: { wallet: fusdtWallet, vault: fusdtVault, total: fusdtWallet + fusdtVault },
      fbtc: { wallet: fbtcWallet, vault: fbtcVault, total: fbtcWallet + fbtcVault },
      totalUsd: (fethWallet + fethVault) * ethPrice + (fusdtWallet + fusdtVault) + (fbtcWallet + fbtcVault) * btcPrice,
      walletUsd: fethWallet * ethPrice + fusdtWallet + fbtcWallet * btcPrice,
      vaultUsd: fethVault * ethPrice + fusdtVault + fbtcVault * btcPrice,
    }
  }, [onChainBalances, ethPrice, btcPrice])

  // Filter on-chain orders
  const activeOnChainOrders = onChainOrders.filter(o => o.status === 'open' || o.status === 'partial')
  const filledOnChainOrders = onChainOrders.filter(o => o.status === 'filled')

  const handleCancelOnChainOrder = async (orderId: number) => {
    await cancelOrder(orderId)
    setTimeout(() => refetchOrders(), 2000)
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })

  const tabConfig = [
    { id: 'overview' as Tab, icon: '📊', label: 'Overview' },
    { id: 'positions' as Tab, icon: '💼', label: 'Positions' },
    { id: 'orders' as Tab, icon: '📝', label: 'Orders', badge: activeOnChainOrders.length },
    { id: 'history' as Tab, icon: '📜', label: 'History' },
  ]

  return (
    <div className="portfolio-container">
      {/* Header */}
      <div className="pf-header">
        <div className="pf-header-left">
          <h2 className="pf-title">💼 Portfolio</h2>
          {isConnected && address && (
            <div className="pf-wallet-chip">
              <span className="pf-wallet-dot"></span>
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
          )}
        </div>
        <div className="pf-header-right">
          <span className="pf-network-badge">🟣 Monad Testnet</span>
        </div>
      </div>

      {!isConnected ? (
        <div className="pf-empty-state">
          <div className="pf-empty-icon">👛</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect to Monad Testnet to view your portfolio and start trading</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="pf-stats-row">
            <div className="pf-stat-card pf-stat-primary">
              <div className="pf-stat-icon">💎</div>
              <div className="pf-stat-content">
                <span className="pf-stat-label">Total Value</span>
                <span className="pf-stat-value">${onChainValue.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className="pf-stat-breakdown">
                  <span>🔓 ${onChainValue.walletUsd.toFixed(2)}</span>
                  <span>🏦 ${onChainValue.vaultUsd.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="pf-stat-card">
              <div className="pf-stat-icon">📊</div>
              <div className="pf-stat-content">
                <span className="pf-stat-label">Total Trades</span>
                <span className="pf-stat-value">{onChainTrades}</span>
              </div>
            </div>
            <div className="pf-stat-card">
              <div className="pf-stat-icon">📝</div>
              <div className="pf-stat-content">
                <span className="pf-stat-label">Active Orders</span>
                <span className="pf-stat-value">{activeOnChainOrders.length}</span>
              </div>
            </div>
            <div className="pf-stat-card">
              <div className="pf-stat-icon">🪙</div>
              <div className="pf-stat-content">
                <span className="pf-stat-label">Assets</span>
                <span className="pf-stat-value">3</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="pf-tabs">
            {tabConfig.map(tab => (
              <button 
                key={tab.id} 
                className={`pf-tab ${activeTab === tab.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="pf-tab-icon">{tab.icon}</span>
                <span className="pf-tab-label">{tab.label}</span>
                {tab.badge && tab.badge > 0 && <span className="pf-tab-badge">{tab.badge}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pf-tab-content">
            {activeTab === 'overview' && (
              <div className="pf-overview">
                {/* Token Holdings */}
                <div className="pf-section">
                  <div className="pf-section-header">
                    <h4>🪙 Token Holdings</h4>
                  </div>
                  <div className="pf-holdings-grid">
                    {/* FETH Card */}
                    <div className="pf-token-card pf-token-eth">
                      <div className="pf-token-header">
                        <div className="pf-token-icon-wrap eth">⟠</div>
                        <div className="pf-token-meta">
                          <span className="pf-token-name">Flash ETH</span>
                          <span className="pf-token-symbol">FETH</span>
                        </div>
                        <div className="pf-token-price">${ethPrice.toLocaleString()}</div>
                      </div>
                      <div className="pf-token-balances">
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🔓 Wallet</span>
                          <span className="pf-balance-value">{onChainValue.feth.wallet.toFixed(4)}</span>
                        </div>
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🏦 Vault</span>
                          <span className="pf-balance-value">{onChainValue.feth.vault.toFixed(4)}</span>
                        </div>
                        <div className="pf-balance-row pf-balance-total">
                          <span className="pf-balance-label">Total</span>
                          <span className="pf-balance-value">{onChainValue.feth.total.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="pf-token-footer">
                        <span className="pf-token-usd">${(onChainValue.feth.total * ethPrice).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* FUSDT Card */}
                    <div className="pf-token-card pf-token-usdt">
                      <div className="pf-token-header">
                        <div className="pf-token-icon-wrap usdt">💵</div>
                        <div className="pf-token-meta">
                          <span className="pf-token-name">Flash USDT</span>
                          <span className="pf-token-symbol">FUSDT</span>
                        </div>
                        <div className="pf-token-price">$1.00</div>
                      </div>
                      <div className="pf-token-balances">
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🔓 Wallet</span>
                          <span className="pf-balance-value">{onChainValue.fusdt.wallet.toLocaleString()}</span>
                        </div>
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🏦 Vault</span>
                          <span className="pf-balance-value">{onChainValue.fusdt.vault.toLocaleString()}</span>
                        </div>
                        <div className="pf-balance-row pf-balance-total">
                          <span className="pf-balance-label">Total</span>
                          <span className="pf-balance-value">{onChainValue.fusdt.total.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pf-token-footer">
                        <span className="pf-token-usd">${onChainValue.fusdt.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* FBTC Card */}
                    <div className="pf-token-card pf-token-btc">
                      <div className="pf-token-header">
                        <div className="pf-token-icon-wrap btc">₿</div>
                        <div className="pf-token-meta">
                          <span className="pf-token-name">Flash BTC</span>
                          <span className="pf-token-symbol">FBTC</span>
                        </div>
                        <div className="pf-token-price">${btcPrice.toLocaleString()}</div>
                      </div>
                      <div className="pf-token-balances">
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🔓 Wallet</span>
                          <span className="pf-balance-value">{onChainValue.fbtc.wallet.toFixed(6)}</span>
                        </div>
                        <div className="pf-balance-row">
                          <span className="pf-balance-label">🏦 Vault</span>
                          <span className="pf-balance-value">{onChainValue.fbtc.vault.toFixed(6)}</span>
                        </div>
                        <div className="pf-balance-row pf-balance-total">
                          <span className="pf-balance-label">Total</span>
                          <span className="pf-balance-value">{onChainValue.fbtc.total.toFixed(6)}</span>
                        </div>
                      </div>
                      <div className="pf-token-footer">
                        <span className="pf-token-usd">${(onChainValue.fbtc.total * btcPrice).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pf-section">
                  <div className="pf-section-header">
                    <h4>⚡ Quick Actions</h4>
                  </div>
                  <div className="pf-actions-grid">
                    <div className="pf-action-card">
                      <div className="pf-action-icon">🚰</div>
                      <div className="pf-action-content">
                        <span className="pf-action-title">Claim Tokens</span>
                        <span className="pf-action-desc">Get free testnet tokens</span>
                      </div>
                      <span className="pf-action-arrow">→</span>
                    </div>
                    <div className="pf-action-card">
                      <div className="pf-action-icon">🏦</div>
                      <div className="pf-action-content">
                        <span className="pf-action-title">Deposit to Vault</span>
                        <span className="pf-action-desc">Enable on-chain trading</span>
                      </div>
                      <span className="pf-action-arrow">→</span>
                    </div>
                    <div className="pf-action-card">
                      <div className="pf-action-icon">📈</div>
                      <div className="pf-action-content">
                        <span className="pf-action-title">Place Order</span>
                        <span className="pf-action-desc">Trade on-chain</span>
                      </div>
                      <span className="pf-action-arrow">→</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="pf-positions">
                {positions.length > 0 ? (
                  <div className="pf-positions-grid">
                    {positions.map((pos, i) => {
                      const pair = pairs.find(p => p.symbol === pos.pair)
                      const currentPrice = pair?.basePrice || pos.entryPrice
                      const unrealizedPnl = (currentPrice - pos.entryPrice) * pos.amount * (pos.side === 'buy' ? 1 : -1)
                      const pnlPercent = (unrealizedPnl / (pos.entryPrice * pos.amount)) * 100
                      
                      return (
                        <div key={i} className={`pf-position-card ${pos.side}`}>
                          <div className="pf-position-header">
                            <div className="pf-position-pair">
                              <span className="pf-position-symbol">{pos.pair}</span>
                              <span className={`pf-position-side ${pos.side}`}>{pos.side.toUpperCase()}</span>
                            </div>
                            <div className={`pf-position-pnl ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                              {unrealizedPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                          <div className="pf-position-body">
                            <div className="pf-position-stat">
                              <span className="pf-position-label">Size</span>
                              <span className="pf-position-value">{pos.amount.toFixed(4)}</span>
                            </div>
                            <div className="pf-position-stat">
                              <span className="pf-position-label">Entry</span>
                              <span className="pf-position-value">${pos.entryPrice.toFixed(2)}</span>
                            </div>
                            <div className="pf-position-stat">
                              <span className="pf-position-label">Current</span>
                              <span className="pf-position-value">${currentPrice.toFixed(2)}</span>
                            </div>
                            <div className="pf-position-stat">
                              <span className="pf-position-label">P&L</span>
                              <span className={`pf-position-value ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                                ${unrealizedPnl.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="pf-empty-card">
                    <div className="pf-empty-icon">💼</div>
                    <h4>No Open Positions</h4>
                    <p>Start trading to build your portfolio</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="pf-orders">
                <div className="pf-section">
                  <div className="pf-section-header">
                    <h4>🔗 On-Chain Orders</h4>
                    <span className="pf-section-badge">{activeOnChainOrders.length}</span>
                  </div>
                  {activeOnChainOrders.length > 0 ? (
                    <div className="pf-orders-list">
                      {activeOnChainOrders.map((order) => (
                        <div key={order.id} className={`pf-order-card ${order.isBuy ? 'buy' : 'sell'}`}>
                          <div className="pf-order-left">
                            <span className={`pf-order-side ${order.isBuy ? 'buy' : 'sell'}`}>
                              {order.isBuy ? '↗ BUY' : '↘ SELL'}
                            </span>
                            <span className="pf-order-status">{order.status}</span>
                          </div>
                          <div className="pf-order-center">
                            <span className="pf-order-amount">{order.amount.toFixed(4)}</span>
                            <span className="pf-order-at">@</span>
                            <span className="pf-order-price">${order.price.toFixed(2)}</span>
                          </div>
                          <div className="pf-order-right">
                            <span className="pf-order-time">{formatTime(order.timestamp)}</span>
                            <button 
                              className="pf-order-cancel" 
                              onClick={() => handleCancelOnChainOrder(order.id)} 
                              disabled={isCancelling}
                            >
                              ✕
                            </button>
                          </div>
                          {order.filledAmount > 0 && (
                            <div className="pf-order-progress">
                              <div className="pf-progress-bar">
                                <div 
                                  className="pf-progress-fill" 
                                  style={{ width: `${(order.filledAmount / order.amount) * 100}%` }} 
                                />
                              </div>
                              <span className="pf-progress-text">
                                {((order.filledAmount / order.amount) * 100).toFixed(0)}% filled
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pf-empty-card small">
                      <div className="pf-empty-icon">📝</div>
                      <h4>No Active Orders</h4>
                      <p>Place on-chain orders to see them here</p>
                    </div>
                  )}
                </div>

                {openOrders.length > 0 && (
                  <div className="pf-section">
                    <div className="pf-section-header">
                      <h4>⚡ Off-Chain Orders</h4>
                      <span className="pf-section-badge">{openOrders.length}</span>
                    </div>
                    <div className="pf-orders-list">
                      {openOrders.map((order, i) => (
                        <div key={i} className={`pf-order-card ${order.side}`}>
                          <div className="pf-order-left">
                            <span className={`pf-order-side ${order.side}`}>
                              {order.side === 'buy' ? '↗ BUY' : '↘ SELL'}
                            </span>
                            <span className="pf-order-type">{order.type}</span>
                          </div>
                          <div className="pf-order-center">
                            <span className="pf-order-amount">{order.amount.toFixed(4)}</span>
                            <span className="pf-order-at">@</span>
                            <span className="pf-order-price">${order.price.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="pf-history">
                {filledOnChainOrders.length > 0 && (
                  <div className="pf-section">
                    <div className="pf-section-header">
                      <h4>🔗 On-Chain Fills</h4>
                      <span className="pf-section-badge">{filledOnChainOrders.length}</span>
                    </div>
                    <div className="pf-history-list">
                      {filledOnChainOrders.map((order) => (
                        <div key={order.id} className={`pf-history-item ${order.isBuy ? 'buy' : 'sell'}`}>
                          <div className="pf-history-left">
                            <span className={`pf-history-side ${order.isBuy ? 'buy' : 'sell'}`}>
                              {order.isBuy ? '↗ BUY' : '↘ SELL'}
                            </span>
                          </div>
                          <div className="pf-history-center">
                            <span className="pf-history-amount">{order.filledAmount.toFixed(4)}</span>
                            <span className="pf-history-at">@</span>
                            <span className="pf-history-price">${order.price.toFixed(2)}</span>
                          </div>
                          <div className="pf-history-right">
                            <span className="pf-history-value">${(order.filledAmount * order.price).toFixed(2)}</span>
                            <span className="pf-history-time">{formatDate(order.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {tradeHistory.length > 0 && (
                  <div className="pf-section">
                    <div className="pf-section-header">
                      <h4>⚡ Off-Chain Trades</h4>
                      <span className="pf-section-badge">{tradeHistory.length}</span>
                    </div>
                    <div className="pf-history-list">
                      {tradeHistory.slice(0, 10).map((trade, i) => (
                        <div key={i} className={`pf-history-item ${trade.side}`}>
                          <div className="pf-history-left">
                            <span className={`pf-history-side ${trade.side}`}>
                              {trade.side === 'buy' ? '↗ BUY' : '↘ SELL'}
                            </span>
                          </div>
                          <div className="pf-history-center">
                            <span className="pf-history-amount">{trade.amount.toFixed(4)}</span>
                            <span className="pf-history-at">@</span>
                            <span className="pf-history-price">${trade.price.toFixed(2)}</span>
                          </div>
                          <div className="pf-history-right">
                            <span className="pf-history-value">${(trade.amount * trade.price).toFixed(2)}</span>
                            <span className="pf-history-time">{formatTime(trade.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filledOnChainOrders.length === 0 && tradeHistory.length === 0 && (
                  <div className="pf-empty-card">
                    <div className="pf-empty-icon">📜</div>
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
