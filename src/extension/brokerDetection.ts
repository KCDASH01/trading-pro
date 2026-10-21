import type { BrokerId, DetectedBroker } from '../domain/product'

const BROKERS: Record<string, { id: Exclude<BrokerId, 'unknown'>; label: string }> = {
  'kite.zerodha.com': { id: 'zerodha', label: 'Zerodha' },
  'tv.upstox.com': { id: 'upstox', label: 'Upstox' },
  'web.dhan.co': { id: 'dhan', label: 'Dhan' },
}

export function detectBroker(url?: string): DetectedBroker {
  let hostname = ''
  try { hostname = url ? new URL(url).hostname.toLowerCase() : '' } catch { hostname = '' }
  const broker = BROKERS[hostname]
  return broker ? { ...broker, hostname, supported: true } : { id: 'unknown', label: 'No supported broker', hostname, supported: false }
}

export async function detectActiveBroker(): Promise<DetectedBroker> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return detectBroker(globalThis.location?.href)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return detectBroker(tab?.url)
}
