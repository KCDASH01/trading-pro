// Public, isolated companion adapter. It deliberately avoids TradingView private APIs.
const panel = document.createElement('button')
panel.type = 'button'
panel.textContent = 'Open Trading Signal Pro'
panel.setAttribute('aria-label', 'Open Trading Signal Pro companion dashboard')
Object.assign(panel.style, {
  position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
  padding: '10px 14px', border: '1px solid #2b7fff', borderRadius: '8px',
  background: '#0d1626', color: '#e7edf8', font: '600 12px system-ui', cursor: 'pointer',
})
panel.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' }))
document.documentElement.append(panel)

chrome.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string })?.type === 'TSP_REMOVE_ADAPTER') panel.remove()
})
