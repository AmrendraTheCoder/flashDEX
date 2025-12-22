import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PriceAlert {
  id: string
  pair: string
  price: number
  condition: 'above' | 'below'
  triggered: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: number
}

interface UIState {
  // Theme
  darkMode: boolean
  toggleDarkMode: () => void
  
  // Sidebar
  sidebarOpen: boolean
  sidebarContent: 'alerts' | 'settings' | 'achievements' | 'history' | 'wallet' | null
  openSidebar: (content: UIState['sidebarContent']) => void
  closeSidebar: () => void
  
  // Sound
  soundEnabled: boolean
  toggleSound: () => void
  
  // Price Alerts
  priceAlerts: PriceAlert[]
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'triggered'>) => void
  removePriceAlert: (id: string) => void
  triggerAlert: (id: string) => void
  
  // Achievements
  achievements: Achievement[]
  unlockAchievement: (id: string) => void
  
  // Trading Settings
  slippage: number
  setSlippage: (value: number) => void
  
  // Keyboard shortcuts enabled
  shortcutsEnabled: boolean
  toggleShortcuts: () => void
  
  // Onboarding
  hasSeenOnboarding: boolean
  setHasSeenOnboarding: (value: boolean) => void
  
  // Loading states
  isLoading: boolean
  setLoading: (value: boolean) => void
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_trade', name: 'First Trade', description: 'Execute your first trade', icon: '🎯', unlocked: false },
  { id: 'volume_1k', name: 'Volume King', description: 'Trade $1,000 in volume', icon: '👑', unlocked: false },
  { id: 'volume_10k', name: 'Whale', description: 'Trade $10,000 in volume', icon: '🐋', unlocked: false },
  { id: 'profit_100', name: 'In Profit', description: 'Make $100 profit', icon: '💰', unlocked: false },
  { id: 'trades_10', name: 'Active Trader', description: 'Complete 10 trades', icon: '📈', unlocked: false },
  { id: 'trades_100', name: 'Pro Trader', description: 'Complete 100 trades', icon: '🏆', unlocked: false },
  { id: 'stress_test', name: 'Stress Tester', description: 'Run the 10K stress test', icon: '⚡', unlocked: false },
  { id: 'all_pairs', name: 'Diversified', description: 'Trade all 3 pairs', icon: '🌐', unlocked: false },
]

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      darkMode: true, // Default to dark mode
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      
      sidebarOpen: false,
      sidebarContent: null,
      openSidebar: (content) => set({ sidebarOpen: true, sidebarContent: content }),
      closeSidebar: () => set({ sidebarOpen: false, sidebarContent: null }),
      
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      
      priceAlerts: [],
      addPriceAlert: (alert) => set((state) => ({
        priceAlerts: [...state.priceAlerts, { ...alert, id: Date.now().toString(), triggered: false }]
      })),
      removePriceAlert: (id) => set((state) => ({
        priceAlerts: state.priceAlerts.filter(a => a.id !== id)
      })),
      triggerAlert: (id) => set((state) => ({
        priceAlerts: state.priceAlerts.map(a => a.id === id ? { ...a, triggered: true } : a)
      })),
      
      achievements: DEFAULT_ACHIEVEMENTS,
      unlockAchievement: (id) => set((state) => ({
        achievements: state.achievements.map(a => 
          a.id === id && !a.unlocked ? { ...a, unlocked: true, unlockedAt: Date.now() } : a
        )
      })),
      
      slippage: 0.5,
      setSlippage: (value) => set({ slippage: value }),
      
      shortcutsEnabled: true,
      toggleShortcuts: () => set((state) => ({ shortcutsEnabled: !state.shortcutsEnabled })),
      
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
      
      isLoading: false,
      setLoading: (value) => set({ isLoading: value }),
    }),
    {
      name: 'monad-ui-settings',
      partialize: (state) => ({
        darkMode: state.darkMode,
        soundEnabled: state.soundEnabled,
        slippage: state.slippage,
        shortcutsEnabled: state.shortcutsEnabled,
        priceAlerts: state.priceAlerts,
        achievements: state.achievements,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    }
  )
)
