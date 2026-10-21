import type { AppSession, ProductPreferences, SignalFeedItem, StrategyCard } from '../domain/product'

export const API_URL = 'http://127.0.0.1:3100'
const request = async <T>(path: string, options: RequestInit = {}, token?: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const body = await response.json() as { message?: string } & T
  if (!response.ok) throw new Error(body.message ?? `Request failed (${response.status})`)
  return body
}
export const productApi = {
  sendOtp: (countryCode: string, mobile: string) => request<{ expiresAt: number; resendAfterSeconds: number; demo: boolean; demoOtp?: string }>('/api/v1/auth/send-otp', { method: 'POST', body: JSON.stringify({ countryCode, mobile }) }),
  verifyOtp: (countryCode: string, mobile: string, otp: string) => request<AppSession>('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ countryCode, mobile, otp }) }),
  me: (token: string) => request<AppSession['user']>('/api/v1/me', {}, token),
  logout: (token: string) => request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' }, token),
  strategies: (token: string) => request<StrategyCard[]>('/api/v1/strategies', {}, token),
  setStrategy: (token: string, id: string, applied: boolean) => request(`/api/v1/strategies/${id}/apply`, { method: applied ? 'POST' : 'DELETE' }, token),
  favoriteStrategy: (token: string, id: string, favorite: boolean) => request(`/api/v1/strategies/${id}/favorite`, { method: favorite ? 'POST' : 'DELETE' }, token),
  signals: async () => (await request<{ items: SignalFeedItem[]; nextCursor: string | null }>('/api/v1/signals?limit=50')).items,
  preferences: (token: string) => request<ProductPreferences>('/api/v1/preferences', {}, token),
  updatePreferences: (token: string, preferences: Partial<ProductPreferences>) => request<ProductPreferences>('/api/v1/preferences', { method: 'PUT', body: JSON.stringify(preferences) }, token),
  brokerStatus: (token: string) => request<Array<{ brokerId: string; status: string }>>('/api/v1/brokers/status', {}, token),
  setBroker: (token: string, id: string, connected: boolean) => request<{ brokerId: string; status: string }>(`/api/v1/brokers/${id}/${connected ? 'connect' : 'disconnect'}`, { method: 'POST' }, token),
}

const SESSION_KEY = 'tsp-session'
export async function loadSession(): Promise<AppSession | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) return (await chrome.storage.local.get(SESSION_KEY))[SESSION_KEY] as AppSession | null ?? null
  const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) as AppSession : null
}
export async function saveSession(session: AppSession | null) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) { if (session) await chrome.storage.local.set({ [SESSION_KEY]: session }); else await chrome.storage.local.remove(SESSION_KEY); return }
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY)
}
