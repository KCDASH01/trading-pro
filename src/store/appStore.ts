import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { DEFAULT_SETTINGS, type Signal, type StrategySettings, type Timeframe } from '../domain/types'

interface PaperPosition {
  id: string
  signalId: string
  symbol: string
  direction: 'BUY' | 'SELL'
  quantity: number
  entry: number
  openedAt: number
}

interface AppState {
  symbol: string
  timeframe: Timeframe
  settings: StrategySettings
  balance: number
  positions: PaperPosition[]
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: Timeframe) => void
  updateSettings: (settings: Partial<StrategySettings>) => void
  openPaperTrade: (signal: Signal) => void
}

const memoryStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
const storage: StateStorage = typeof chrome !== 'undefined' && chrome.storage?.local
  ? {
      getItem: async (name: string) => {
        const value = (await chrome.storage.local.get(name))[name]
        return typeof value === 'string' ? value : null
      },
      setItem: async (name: string, value: string) => { await chrome.storage.local.set({ [name]: value }) },
      removeItem: async (name: string) => { await chrome.storage.local.remove(name) },
    }
  : typeof localStorage !== 'undefined' ? localStorage : memoryStorage

export const useAppStore = create<AppState>()(persist((set) => ({
  symbol: 'NIFTY', timeframe: '15m', settings: DEFAULT_SETTINGS, balance: 100000, positions: [],
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  openPaperTrade: (signal) => set((state) => {
    if (state.positions.some((position) => position.signalId === signal.id)) return state
    const riskBudget = state.balance * state.settings.riskPercent / 100
    const quantity = Math.max(1, Math.floor(riskBudget / Math.abs(signal.entry - signal.stopLoss)))
    return { positions: [...state.positions, { id: crypto.randomUUID(), signalId: signal.id, symbol: signal.symbol, direction: signal.direction, quantity, entry: signal.entry, openedAt: Date.now() }] }
  }),
}), { name: 'trading-signal-pro', storage: createJSONStorage(() => storage) }))
