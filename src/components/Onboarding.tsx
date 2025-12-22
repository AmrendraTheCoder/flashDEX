import { useState, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

const STEPS = [
  {
    title: 'Welcome to FlashDEX',
    description: 'Experience lightning-fast decentralized trading powered by Monad blockchain. This demo showcases 10,000+ TPS order matching.',
    icon: '⚡',
  },
  {
    title: 'Connect Your Wallet',
    description: 'Click "Connect Wallet" in the top right to start trading. Your demo balance starts at $10,000 USDT.',
    icon: '👛',
    highlight: '.connect-wallet-btn',
  },
  {
    title: 'Start the Simulation',
    description: 'Click "Start Simulation" to activate trading bots. Watch the order book fill with live orders!',
    icon: '🤖',
    highlight: '.bot-controls',
  },
  {
    title: 'Place Your First Trade',
    description: 'Use the trading panel to buy or sell. Try Market orders for instant execution or Limit orders for specific prices.',
    icon: '📈',
    highlight: '.trading-panel',
  },
  {
    title: 'Run the Stress Test',
    description: 'Click "Run 10K Stress Test" to see Monad handle 10,000 orders instantly. This is the power of parallel execution!',
    icon: '🚀',
    highlight: '.stress-test',
  },
  {
    title: 'You\'re Ready!',
    description: 'Explore Portfolio to track your P&L, Analytics for market data, and compete in Trading Competitions!',
    icon: '🏆',
  },
]

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const { hasSeenOnboarding, setHasSeenOnboarding } = useUIStore()

  useEffect(() => {
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [hasSeenOnboarding])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => setHasSeenOnboarding(true), 300)
  }

  if (hasSeenOnboarding || !isVisible) return null

  const step = STEPS[currentStep]

  return (
    <>
      <div className={`onboarding-overlay ${isVisible ? 'visible' : ''}`} />
      <div className={`onboarding-modal ${isVisible ? 'visible' : ''}`}>
        <button className="onboarding-close" onClick={handleSkip}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        
        <div className="onboarding-icon">{step.icon}</div>
        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-desc">{step.description}</p>
        
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`progress-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'done' : ''}`} />
          ))}
        </div>
        
        <div className="onboarding-actions">
          <button className="skip-btn" onClick={handleSkip}>Skip Tour</button>
          <button className="next-btn" onClick={handleNext}>
            {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}