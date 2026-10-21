const ALARM_NOTIFICATION_ID = 'trading-signal-pro'

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ installedAt: Date.now(), liveTradingEnabled: false })
})

chrome.runtime.onMessage.addListener((message: unknown, _sender, respond) => {
  if (typeof message !== 'object' || message === null) return
  const payload = message as { type?: string; title?: string; body?: string }
  if (payload.type === 'TSP_NOTIFY') {
    chrome.notifications.create(ALARM_NOTIFICATION_ID, {
      type: 'basic',
      iconUrl: 'favicon.svg',
      title: payload.title ?? 'Trading Signal Pro',
      message: payload.body ?? 'A new demo signal is available.',
    })
    respond({ ok: true })
  }
  if (payload.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
    respond({ ok: true })
  }
})
import { detectBroker } from './brokerDetection'


const updateDetectedBroker = async (tabId?: number) => {
  const tab = tabId ? await chrome.tabs.get(tabId).catch(() => undefined) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
  await chrome.storage.local.set({ 'tsp-detected-broker': detectBroker(tab?.url) })
}
chrome.tabs.onActivated.addListener(({ tabId }) => { void updateDetectedBroker(tabId) })
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => { if (changeInfo.url) void updateDetectedBroker(tabId) })
