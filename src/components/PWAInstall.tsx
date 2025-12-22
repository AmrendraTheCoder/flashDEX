import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a delay
      setTimeout(() => setIsVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    
    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setIsVisible(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-dismissed', 'true')
  }

  // Don't show if dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('pwa-dismissed')) {
      setIsVisible(false)
    }
  }, [])

  if (!isVisible || isInstalled || !installPrompt) return null

  return (
    <div className="pwa-install-banner">
      <div className="pwa-content">
        <div className="pwa-icon">
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
            <rect width="512" height="512" rx="128" fill="url(#g)"/>
            <path d="M128 256L256 128L384 256L256 384L128 256Z" fill="white" fillOpacity="0.95"/>
            <path d="M192 256L256 192L320 256L256 320L192 256Z" fill="url(#g)"/>
            <defs><linearGradient id="g" x1="0" y1="0" x2="512" y2="512">
              <stop stopColor="#6366f1"/><stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient></defs>
          </svg>
        </div>
        <div className="pwa-text">
          <strong>Install FlashDEX</strong>
          <span>Add to home screen for the best experience</span>
        </div>
      </div>
      <div className="pwa-actions">
        <button className="pwa-dismiss" onClick={handleDismiss}>Not now</button>
        <button className="pwa-install" onClick={handleInstall}>Install</button>
      </div>
    </div>
  )
}