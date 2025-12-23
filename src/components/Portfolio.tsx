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

  return (
    <div className="portfolio-container">
      <div className="portfolio-header-section">
        <div className="portfolio-title-row">
          <h2>💼 Portfolio</h2>
          {isConnected && address && (
            <span className="wallet-badge">{address.slice(0, 6)}...{address.slice(-4)}</span>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="portfolio-empty-state">
          <div className="empty-icon-large">👛</div>
          <h3>Connect Your Wallet</h3>
          <p>Connect to Monad Testnet to view your portfolio</p>
        </div>
      ) : (
        <>
          {/* Main Value Cards */}
          <div className="portfolio-value-cards">
            <div className="value-card primary gradient-card">
              <div className="value-card-header">
                <span className="value-icon">💎</span>
                <span className="value-label">Total Portfolio</span>
              </div>
              <div className="value-amount large">${onChainValue.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="value-breakdown">
                <span>Wallet: ${onChainValue.walletUsd.toFixed(2)}</span>
                <span>Vault: ${onChainValue.vaultUsd.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="value-card">
              <div className="value-card-header">
                <span className="value-icon">📊</span>
                <span className="value-label">On-Chain Stats</span>
              </div>
              <div className="value-amount">{onChainTrades}</div>
              <div className="value-subtext">Total Trades</div>
            </div>
            
            <div className="value-card">
              <div className="value-card-header">
                <span className="value-icon">📝</span>
                <span className="value-label">Active Orders</span>
              </div>
              <div className="value-amount">{activeOnChainOrders.length}</div>
              <div className="value-subtext">On-chain orders</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="portfolio-tabs">
            {(['overview', 'positions', 'orders', 'history'] as Tab[]).map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'overview' && '📊'}{tab === 'positions' && '💼'}{tab === 'orders' && '📝'}{tab === 'history' && '📜'}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                {tab === 'orders' && activeOnChainOrders.length > 0 && <span className="tab-badge">{activeOnChainOrders.length}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="portfolio-tab-content">
            {activeTab === 'overview' && (
              <div className="overview-content">
                {/* Token Holdings */}
                <div className="holdings-section">
                  <h4>🪙 Token Holdings</h4>
                  <div className="holdings-grid">
                    <div className="holding-card">
                      <div className="holding-header">
                        <span className="token-icon">⟠</span>
                        <div className="token-info">
                          <span className="token-name">Flash ETH</span>
                          <span className="token-symbol">FETH</span>
                        </div>
                        <span className="token-price">${ethPrice.toLocaleString()}</span>
                      </div>
                      <div className="holding-balances">
                        <div className="balance-line"><span>Wallet</span><span>{onChainValue.feth.wallet.toFixed(4)}</span></div>
                        <div className="balance-line"><span>Vault</span><span>{onChainValue.feth.vault.toFixed(4)}</span></div>
                        <div className="balance-line total"><span>Total</span><span>{onChainValue.feth.total.toFixed(4)}</span></div>
                      </div>
                      <div className="holding-value">${(onChainValue.feth.total * ethPrice).toFixed(2)}</div>
                    </div>

                    <div className="holding-card">
                      <div className="holding-header">
                        <span className="token-icon">💵</span>
                        <div className="token-info">
                          <span className="token-name">Flash USDT</span>
                          <span className="token-symbol">FUSDT</span>
                        </div>
                        <span className="token-price">$1.00</span>
                      </div>
                      <div className="holding-balances">
                        <div className="balance-line"><span>Wallet</span><span>{onChainValue.fusdt.wallet.toLocaleString()}</span></div>
                        <div className="balance-line"><span>Vault</span><span>{onChainValue.fusdt.vault.toLocaleString()}</span></div>
                        <div className="balance-line total"><span>Total</span><span>{onChainValue.fusdt.total.toLocaleString()}</span></div>
                      </div>
                      <div className="holding-value">${onChainValue.fusdt.total.toFixed(2)}</div>
                    </div>

                    <div className="holding-card">
                      <div className="holding-header">
                        <span className="token-icon">₿</span>
                        <div className="token-info">
                          <span className="token-name">Flash BTC</span>
                          <span className="token-symbol">FBTC</span>
                        </div>
                        <span className="token-price">${btcPrice.toLocaleString()}</span>
                      </div>
                      <div className="holding-balances">
                        <div className="balance-line"><span>Wallet</span><span>{onChainValue.fbtc.wallet.toFixed(6)}</span></div>
                        <div className="balance-line"><span>Vault</span><span>{onChainValue.fbtc.vault.toFixed(6)}</span></div>
                        <div className="balance-line total"><span>Total</span><span>{onChainValue.fbtc.total.toFixed(6)}</span></div>
                      </div>
                      <div className="holding-value">${(onChainValue.fbtc.total * btcPrice).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-section">
                  <h4>⚡ Quick Actions</h4>
                  <div className="quick-actions-grid">
                    <div className="action-card">
                      <span className="action-icon">🚰</span>
                      <span className="action-label">Claim from Faucet</span>
                      <span className="action-desc">Get free testnet tokens</span>
                    </div>
                    <div className="action-card">
                      <span className="action-icon">🏦</span>
                      <span className="action-label">Deposit to Vault</span>
                      <span className="action-desc">Enable trading</span>
                    </div>
                    <div className="action-card">
                      <span className="action-icon">📈</span>
                      <span className="action-label">Place Order</span>
                      <span className="action-desc">Trade on-chain</span>
                    </div>
                  </div>
                </div>
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
                      
                      return (
                        <div key={i} className="position-card">
                          <div className="position-card-header">
                            <div className="position-pair-info">
                              <span className="position-pair">{pos.pair}</span>
                              <span className={`position-side-badge ${pos.side}`}>{pos.side.toUpperCase()}</span>
                            </div>
                            <div className={`position-pnl-badge ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                              {unrealizedPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                            </div>
                          </div>
                          <div className="position-details-grid">
                            <div className="position-detail"><span>Size</span><span>{pos.amount.toFixed(4)}</span></div>
                            <div className="position-detail"><span>Entry</span><span>${pos.entryPrice.toFixed(2)}</span></div>
                            <div className="position-detail"><span>Current</span><span>${currentPrice.toFixed(2)}</span></div>
                            <div className="position-detail"><span>P&L</span><span className={unrealizedPnl >= 0 ? 'positive' : 'negative'}>${unrealizedPnl.toFixed(2)}</span></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-state-card"><span className="empty-icon">💼</span><h4>No Open Positions</h4><p>Start trading to build your portfolio</p></div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="orders-content">
                <h4>🔗 On-Chain Orders</h4>
                {activeOnChainOrders.length > 0 ? (
                  <div className="orders-list">
                    {activeOnChainOrders.map((order) => (
                      <div key={order.id} className={`order-card ${order.isBuy ? 'buy' : 'sell'}`}>
                        <div className="order-main">
                          <span className={`order-side ${order.isBuy ? 'buy' : 'sell'}`}>{order.isBuy ? 'BUY' : 'SELL'}</span>
                          <span className="order-price">${order.price.toFixed(2)}</span>
                          <span className="order-amount">{order.amount.toFixed(4)}</span>
                          <span className="order-status">{order.status}</span>
                          <span className="order-time">{formatTime(order.timestamp)}</span>
                          <button className="cancel-btn" onClick={() => handleCancelOnChainOrder(order.id)} disabled={isCancelling}>✕</button>
                        </div>
                        {order.filledAmount > 0 && (
                          <div className="order-fill-bar">
                            <div className="fill-progress" style={{ width: `${(order.filledAmount / order.amount) * 100}%` }} />
                            <span className="fill-text">{((order.filledAmount / order.amount) * 100).toFixed(0)}% filled</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-card"><span className="empty-icon">📝</span><h4>No Active Orders</h4><p>Place on-chain orders to see them here</p></div>
                )}

                {openOrders.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '20px' }}>⚡ Off-Chain Orders</h4>
                    <div className="orders-list">
                      {openOrders.map((order, i) => (
                        <div key={i} className={`order-card ${order.side}`}>
                          <div className="order-main">
                            <span className={`order-side ${order.side}`}>{order.side.toUpperCase()}</span>
                            <span className="order-price">${order.price.toFixed(2)}</span>
                            <span className="order-amount">{order.amount.toFixed(4)}</span>
                            <span className="order-type">{order.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-content">
                {filledOnChainOrders.length > 0 && (
                  <>
                    <h4>🔗 On-Chain Fills</h4>
                    <div className="history-list">
                      {filledOnChainOrders.map((order) => (
                        <div key={order.id} className="history-item">
                          <span className={`history-side ${order.isBuy ? 'buy' : 'sell'}`}>{order.isBuy ? '↗ BUY' : '↘ SELL'}</span>
                          <span className="history-amount">{order.filledAmount.toFixed(4)}</span>
                          <span className="history-price">@ ${order.price.toFixed(2)}</span>
                          <span className="history-time">{formatDate(order.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {tradeHistory.length > 0 && (
                  <>
                    <h4 style={{ marginTop: '20px' }}>⚡ Off-Chain Trades</h4>
                    <div className="history-list">
                      {tradeHistory.slice(0, 10).map((trade, i) => (
                        <div key={i} className="history-item">
                          <span className={`history-side ${trade.side}`}>{trade.side === 'buy' ? '↗ BUY' : '↘ SELL'}</span>
                          <span className="history-amount">{trade.amount.toFixed(4)}</span>
                          <span className="history-price">@ ${trade.price.toFixed(2)}</span>
                          <span className="history-value">${(trade.amount * trade.price).toFixed(2)}</span>
                          <span className="history-time">{formatTime(trade.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {filledOnChainOrders.length === 0 && tradeHistory.length === 0 && (
                  <div className="empty-state-card"><span className="empty-icon">📜</span><h4>No Trade History</h4><p>Your completed trades will appear here</p></div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
