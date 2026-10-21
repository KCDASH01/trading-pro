import { describe, expect, it } from 'vitest'
import { detectBroker } from './brokerDetection'
import { MockBrokerConnectionAdapter } from '../adapters/brokerConnections'

describe('isolated broker detection', () => {
  it.each([['https://kite.zerodha.com/chart','zerodha'],['https://tv.upstox.com/','upstox'],['https://web.dhan.co/','dhan']] as const)('normalizes %s', (url, id) => expect(detectBroker(url)).toMatchObject({ id, supported: true }))
  it('returns unknown for unsupported and malformed locations', () => { expect(detectBroker('https://example.com')).toMatchObject({ id: 'unknown', supported: false }); expect(detectBroker('bad')).toMatchObject({ id: 'unknown' }) })
  it('supports safe mock connect and disconnect states', async () => { const adapter = new MockBrokerConnectionAdapter('zerodha', 'Zerodha'); await adapter.connect(); expect(await adapter.getConnectionStatus()).toBe('connected'); await adapter.disconnect(); expect(await adapter.getConnectionStatus()).toBe('not_connected') })
})
