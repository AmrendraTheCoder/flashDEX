import { create } from 'zustand'

export interface Competitor {
  address: string
  name: string
  pnl: number
  trades: number
  volume: number
  joinedAt: number
}

export interface Competition {
  id: string
  name: string
  startTime: number
  endTime: number
  status: 'upcoming' | 'active' | 'ended'
  participants: Competitor[]
  prizePool: number
}

interface CompetitionState {
  activeCompetition: Competition | null
  isJoined: boolean
  competitors: Competitor[]
  
  // WebSocket simulation
  connectedUsers: number
  liveActivity: { trader: string; action: string; amount: number; time: number }[]
  
  // Actions
  startCompetition: (duration: number) => void
  joinCompetition: (address: string, name: string) => void
  updateCompetitor: (address: string, pnl: number, trades: number, volume: number) => void
  endCompetition: () => void
  addLiveActivity: (activity: { trader: string; action: string; amount: number }) => void
  simulateUsers: () => void
}

export const useCompetitionStore = create<CompetitionState>((set, get) => ({
  activeCompetition: null,
  isJoined: false,
  competitors: [],
  connectedUsers: 1,
  liveActivity: [],

  startCompetition: (duration) => {
    const now = Date.now()
    set({
      activeCompetition: {
        id: `comp-${now}`,
        name: 'Speed Trading Challenge',
        startTime: now,
        endTime: now + duration * 60 * 1000,
        status: 'active',
        participants: [],
        prizePool: 1000,
      },
      competitors: [],
      isJoined: false,
    })
    
    // Auto-end competition
    setTimeout(() => {
      const state = get()
      if (state.activeCompetition?.id === `comp-${now}`) {
        set(s => ({
          activeCompetition: s.activeCompetition 
            ? { ...s.activeCompetition, status: 'ended' }
            : null
        }))
      }
    }, duration * 60 * 1000)
  },

  joinCompetition: (address, name) => {
    set(state => {
      if (!state.activeCompetition) return {}
      const newCompetitor: Competitor = {
        address,
        name,
        pnl: 0,
        trades: 0,
        volume: 0,
        joinedAt: Date.now(),
      }
      return {
        isJoined: true,
        competitors: [...state.competitors, newCompetitor],
        activeCompetition: {
          ...state.activeCompetition,
          participants: [...state.activeCompetition.participants, newCompetitor],
        },
      }
    })
  },

  updateCompetitor: (address, pnl, trades, volume) => {
    set(state => ({
      competitors: state.competitors.map(c =>
        c.address === address ? { ...c, pnl, trades, volume } : c
      ).sort((a, b) => b.pnl - a.pnl),
    }))
  },

  endCompetition: () => {
    set(state => ({
      activeCompetition: state.activeCompetition
        ? { ...state.activeCompetition, status: 'ended' }
        : null,
    }))
  },

  addLiveActivity: (activity) => {
    set(state => ({
      liveActivity: [
        { ...activity, time: Date.now() },
        ...state.liveActivity,
      ].slice(0, 20),
    }))
  },

  simulateUsers: () => {
    // Simulate other users joining/trading
    const names = ['whale.eth', 'degen.mon', 'trader42', 'flashbot', 'monadking', 'speedster']
    const actions = ['bought', 'sold', 'placed limit', 'filled']
    
    setInterval(() => {
      const state = get()
      if (state.activeCompetition?.status !== 'active') return
      
      // Random user count fluctuation
      set(s => ({ connectedUsers: Math.max(1, s.connectedUsers + Math.floor(Math.random() * 3) - 1) }))
      
      // Random activity
      if (Math.random() > 0.3) {
        const trader = names[Math.floor(Math.random() * names.length)]
        const action = actions[Math.floor(Math.random() * actions.length)]
        const amount = (Math.random() * 2).toFixed(3)
        get().addLiveActivity({ trader, action, amount: parseFloat(amount) })
        
        // Update simulated competitor
        const existing = state.competitors.find(c => c.name === trader)
        if (existing) {
          get().updateCompetitor(
            existing.address,
            existing.pnl + (Math.random() - 0.5) * 100,
            existing.trades + 1,
            existing.volume + parseFloat(amount) * 3500
          )
        } else if (state.competitors.length < 10) {
          set(s => ({
            competitors: [...s.competitors, {
              address: `0x${Math.random().toString(16).slice(2, 10)}`,
              name: trader,
              pnl: (Math.random() - 0.5) * 200,
              trades: Math.floor(Math.random() * 10),
              volume: Math.random() * 10000,
              joinedAt: Date.now(),
            }].sort((a, b) => b.pnl - a.pnl),
          }))
        }
      }
    }, 2000)
  },
}))