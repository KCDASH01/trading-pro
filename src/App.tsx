import { useCallback, useEffect, useState } from 'react'
import { Activity, BellRing, LineChart, Loader2, Settings, SlidersHorizontal, TerminalSquare } from 'lucide-react'
import { io } from 'socket.io-client'
import './App.css'
import { API_URL, loadSession, productApi, saveSession } from './api/productApi'
import { useTradingSnapshot } from './api/tradingApi'
import { Onboarding } from './components/Onboarding'
import { ProductSettings } from './components/ProductSettings'
import { SignalsPage } from './components/SignalsPage'
import { StrategiesPage } from './components/StrategiesPage'
import { TerminalPage } from './components/TerminalPage'
import type { AppMode, AppSession, DetectedBroker, ProductPreferences, SignalFeedItem, StrategyCard } from './domain/product'
import type { Timeframe } from './domain/types'
import { detectActiveBroker } from './extension/brokerDetection'
import { addNotifiedId, shouldNotify } from './features/notificationDeduper'
import { useAppStore } from './store/appStore'

type Page = 'Signals' | 'Strategies' | 'Terminal' | 'Settings'
const DEFAULT_PREFERENCES: ProductPreferences = { appearance: 'dark', signalNotifications: true, signalSound: false, soundEffects: false, signalHistory: true, defaultMarket: 'india', defaultTimeframe: '15m', defaultRiskPercent: 1, paperTrading: true }
const UNKNOWN_BROKER: DetectedBroker = { id: 'unknown', label: 'No supported broker', hostname: '', supported: false }
const navigation = [['Signals', LineChart], ['Strategies', SlidersHorizontal], ['Terminal', TerminalSquare], ['Settings', Settings]] as const

function App() {
  const surface = document.body.dataset.surface
  const [mode, setMode] = useState<AppMode>('loading')
  const [page, setPage] = useState<Page>('Signals')
  const [session, setSession] = useState<AppSession | null>(null)
  const [broker, setBroker] = useState<DetectedBroker>(UNKNOWN_BROKER)
  const [brokerStatus, setBrokerStatus] = useState('not_connected')
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [strategies, setStrategies] = useState<StrategyCard[]>([])
  const [signals, setSignals] = useState<SignalFeedItem[]>([])
  const [toast, setToast] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const symbol = useAppStore((state) => state.symbol)
  const timeframe = useAppStore((state) => state.timeframe)
  const settings = useAppStore((state) => state.settings)
  const setSymbol = useAppStore((state) => state.setSymbol)
  const setTimeframe = useAppStore((state) => state.setTimeframe)
  const openPaperTrade = useAppStore((state) => state.openPaperTrade)
  const trading = useTradingSnapshot(symbol, timeframe, settings, session?.token)

  const loadProductState = useCallback(async (activeSession: AppSession) => {
    const [nextPreferences, nextStrategies, nextSignals, statuses] = await Promise.all([productApi.preferences(activeSession.token), productApi.strategies(activeSession.token), productApi.signals(), productApi.brokerStatus(activeSession.token)])
    setPreferences(nextPreferences); setStrategies(nextStrategies); setSignals(nextSignals)
    const detected = await detectActiveBroker(); setBroker(detected)
    setBrokerStatus(statuses.find((item) => item.brokerId === detected.id)?.status ?? 'not_connected')
    setDataLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      const stored = await loadSession()
      if (!active) return
      if (!stored || stored.expiresAt <= Date.now()) { if (stored) await saveSession(null); setMode(stored ? 'session_expired' : 'onboarding'); window.setTimeout(() => setMode('onboarding'), 600); return }
      try { const user = await productApi.me(stored.token); const valid = { ...stored, user }; setSession(valid); await loadProductState(valid); if (active) setMode('authenticated') }
      catch { await saveSession(null); if (active) setMode('onboarding') }
    })()
    return () => { active = false }
  }, [loadProductState])

  useEffect(() => {
    const refreshBroker = () => { void detectActiveBroker().then(setBroker) }
    if (typeof chrome === 'undefined' || !chrome.tabs) return
    chrome.tabs.onActivated.addListener(refreshBroker)
    chrome.tabs.onUpdated.addListener(refreshBroker)
    return () => { chrome.tabs.onActivated.removeListener(refreshBroker); chrome.tabs.onUpdated.removeListener(refreshBroker) }
  }, [])

  useEffect(() => {
    if (!session) return
    const socket = io(`${API_URL}/market`, { transports: ['websocket'], auth: { token: session.token } })
    socket.on('connect', () => { socket.emit('subscribe', { symbol, timeframe, settings }); void productApi.signals().then(setSignals) })
    socket.on('signal:new', () => { void productApi.signals().then(setSignals) })
    socket.on('session:expired', () => { setMode('session_expired'); void saveSession(null) })
    return () => { socket.disconnect() }
  }, [session, symbol, timeframe, settings])

  useEffect(() => {
    const newest = signals[0]
    if (!newest || !preferences.signalNotifications || typeof chrome === 'undefined' || !chrome.storage?.local) return
    void chrome.storage.local.get('tsp-notified-signals').then(async (result) => {
      const ids = (result['tsp-notified-signals'] as string[] | undefined) ?? []
      if (!shouldNotify(ids, newest.id, newest.source)) return
      setToast(`${newest.strategyName}: ${newest.direction} ${newest.symbol}`)
      await chrome.storage.local.set({ 'tsp-notified-signals': addNotifiedId(ids, newest.id) })
      chrome.runtime.sendMessage({ type: 'TSP_NOTIFY', title: `${newest.direction} ${newest.symbol}`, body: `${newest.strategyName} · Entry ₹${newest.entry.toFixed(2)}` }).catch(() => undefined)
    })
  }, [signals, preferences.signalNotifications])

  useEffect(() => { document.documentElement.dataset.theme = preferences.appearance }, [preferences.appearance])
  const authenticated = async (next: AppSession) => { setSession(next); setMode('authenticated'); setDataLoading(true); await loadProductState(next) }
  const logout = async () => { if (session) await productApi.logout(session.token).catch(() => undefined); await saveSession(null); setSession(null); setMode('onboarding') }
  const updatePreferences = async (patch: Partial<ProductPreferences>) => { const optimistic = { ...preferences, ...patch }; setPreferences(optimistic); if (session) setPreferences(await productApi.updatePreferences(session.token, patch).catch(() => optimistic)) }
  const toggleStrategy = async (strategy: StrategyCard) => { if (!session) return; await productApi.setStrategy(session.token, strategy.id, !strategy.applied); setStrategies(await productApi.strategies(session.token)) }
  const toggleFavorite = async (strategy: StrategyCard) => { if (!session) return; await productApi.favoriteStrategy(session.token, strategy.id, !strategy.favorite); setStrategies(await productApi.strategies(session.token)) }
  const connectBroker = async (connected: boolean) => { if (!session || !broker.supported) return; setBrokerStatus('connecting'); try { const result = await productApi.setBroker(session.token, broker.id, connected); setBrokerStatus(result.status); setMode(connected ? 'broker_connected' : 'broker_detected') } catch { setBrokerStatus('error') } }
  const openTerminal = (signal: SignalFeedItem) => { setSymbol(signal.symbol); setTimeframe(signal.timeframe as Timeframe); setPage('Terminal') }

  if (mode === 'loading' || mode === 'session_expired') return <div className="startup-screen"><Loader2 className="spin" /><strong>{mode === 'loading' ? 'Restoring secure session…' : 'Session expired'}</strong></div>
  if (mode === 'onboarding') return <Onboarding onAuthenticated={(next) => void authenticated(next)} onOffline={() => { setDataLoading(false); setMode('offline_demo'); setPage('Terminal') }} />

  const content = page === 'Signals' ? <SignalsPage signals={signals} loading={dataLoading} onOpenTerminal={openTerminal} /> : page === 'Strategies' ? <StrategiesPage strategies={strategies} onToggleApply={(item) => void toggleStrategy(item)} onToggleFavorite={(item) => void toggleFavorite(item)} /> : page === 'Settings' ? <ProductSettings session={session} broker={broker} brokerStatus={brokerStatus} preferences={preferences} onPreference={(patch) => void updatePreferences(patch)} onBroker={(value) => void connectBroker(value)} onLogout={() => void logout()} /> : <TerminalPage trading={trading} onPaper={openPaperTrade} />
  if (surface === 'popup') return <div className="popup-product"><header className="popup-app-header"><div className="brand-mark"><Activity size={18} /></div><div><strong>Trading Signal Pro</strong><span>{mode === 'offline_demo' ? 'OFFLINE DEMO' : 'ACCOUNT VERIFIED'}</span></div><button aria-label="Notifications"><BellRing size={17} /></button></header><nav className="popup-nav">{navigation.map(([label,Icon]) => <button className={page === label ? 'active' : ''} key={label} onClick={() => setPage(label)}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="popup-content">{content}</div>{toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}</div>
  return <div className="app-shell"><aside><div className="brand"><div className="brand-mark"><Activity /></div><div><strong>Trading Signal</strong><span>PRO TERMINAL</span></div></div><nav>{navigation.map(([label,Icon]) => <button className={page === label ? 'active' : ''} key={label} onClick={() => setPage(label)}><Icon size={18} />{label}</button>)}</nav><div className="sidebar-footer"><span>APPLICATION</span><strong><i />{mode === 'offline_demo' ? 'Offline demo' : 'Account verified'}</strong><small>{broker.supported ? `${broker.label} detected` : 'No broker detected'}</small></div></aside><main><header className="topbar"><div><p className="eyebrow">Trading Signal Pro</p><h1>{page}</h1></div>{page === 'Terminal' && <div className="top-actions"><label>Instrument<select value={symbol} onChange={(event) => setSymbol(event.target.value)}><option value="NIFTY">NIFTY 50</option><option value="BANKNIFTY">BANK NIFTY</option><option value="SENSEX">SENSEX</option></select></label><label>Timeframe<select value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)}>{(['5m','15m','1h','1d'] as Timeframe[]).map((item) => <option key={item}>{item}</option>)}</select></label><div className="demo-pill">DEMO DATA</div></div>}</header>{content}</main>{toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}</div>
}
export default App
