import { useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { wagmiConfig } from './config/monad'
import { Header } from './components/Header'
import { OrderBook } from './components/OrderBook'
import { RecentTrades } from './components/RecentTrades'
import { Leaderboard } from './components/Leaderboard'
import { BotControls } from './components/BotControls'
import { PriceChart } from './components/PriceChart'
import { DepthChart } from './components/DepthChart'
import { Portfolio } from './components/Portfolio'
import { TradingPanel } from './components/TradingPanel'
import { StressTest } from './components/StressTest'
import { Analytics } from './components/Analytics'
import { Sidebar } from './components/Sidebar'
import { Onboarding } from './components/Onboarding'
import { Competition } from './components/Competition'
import { useUIStore } from './store/uiStore'
import { useOrderBookStore } from './store/orderBookStore'
import { soundManager } from './utils/sounds'
import './App.css'

const queryClient = new QueryClient()

type View = 'trade' | 'portfolio' | 'analytics' | 'compete'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#lg)"/>
            <path d="M8 16L16 8L24 16L16 24L8 16Z" fill="white" fillOpacity="0.9"/>
            <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="url(#lg)"/>
            <defs><linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient></defs>
          </svg>
        </div>
        <div className="loading-spinner" />
        <p>Loading FlashDEX...</p>
      </div>
    </div>
  )
}

function AppContent() {
  const [view, setView] = useState<View>('trade')
  const [isReady, setIsReady] = useState(false)
  const { darkMode, soundEnabled, priceAlerts, triggerAlert } = useUIStore()
  const { currentPair } = useOrderBookStore()

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsReady(true), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    soundManager.setEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    const check = () => {
      priceAlerts.forEach(alert => {
        if (alert.triggered || alert.pair !== currentPair.symbol) return
        const price = currentPair.basePrice
        const trigger = alert.condition === 'above' ? price >= alert.price : price <= alert.price
        if (trigger) {
          triggerAlert(alert.id)
          soundManager.playAlert()
          toast.success(`Alert: ${alert.pair} ${alert.condition} $${alert.price}`)
        }
      })
    }
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [priceAlerts, currentPair, triggerAlert])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === '1') setView('trade')
      if (e.key === '2') setView('portfolio')
      if (e.key === '3') setView('analytics')
      if (e.key === '4') setView('compete')
      if (e.key === 'Escape') useUIStore.getState().closeSidebar()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!isReady) return <LoadingScreen />

  return (
    <div className="app-container">
      <Toaster position="top-right" richColors expand={false} />
      <Onboarding />
      <Sidebar />
      <Header />

      <nav className="view-nav">
        <button className={view === 'trade' ? 'active' : ''} onClick={() => setView('trade')}>
          Trading
        </button>
        <button className={view === 'portfolio' ? 'active' : ''} onClick={() => setView('portfolio')}>
          Portfolio
        </button>
        <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}>
          Analytics
        </button>
        <button className={view === 'compete' ? 'active' : ''} onClick={() => setView('compete')}>
          Compete
          <span className="nav-badge">Live</span>
        </button>
      </nav>

      {view === 'trade' && (
        <main className="trade-layout fade-in">
          <section className="charts-area">
            <PriceChart />
            <DepthChart />
          </section>
          <section className="book-area">
            <OrderBook />
          </section>
          <section className="trades-area">
            <RecentTrades />
          </section>
          <section className="panel-area">
            <TradingPanel />
          </section>
          <section className="tools-area">
            <BotControls />
            <StressTest />
          </section>
        </main>
      )}

      {view === 'portfolio' && (
        <main className="portfolio-layout fade-in">
          <section className="portfolio-main">
            <Portfolio />
          </section>
          <section className="portfolio-side">
            <Leaderboard />
            <RecentTrades />
          </section>
        </main>
      )}

      {view === 'analytics' && (
        <main className="analytics-layout fade-in">
          <section className="analytics-main">
            <Analytics />
            <PriceChart />
          </section>
          <section className="analytics-side">
            <Leaderboard />
            <StressTest />
          </section>
        </main>
      )}

      {view === 'compete' && (
        <main className="compete-layout fade-in">
          <section className="compete-main">
            <Competition />
          </section>
          <section className="compete-charts">
            <PriceChart />
            <DepthChart />
          </section>
          <section className="compete-side">
            <TradingPanel />
          </section>
        </main>
      )}
    </div>
  )
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  )
}