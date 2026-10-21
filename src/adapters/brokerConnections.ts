export type BrokerConnectionStatus = 'detected' | 'not_connected' | 'connecting' | 'connected' | 'expired' | 'reconnect_required' | 'error'
export interface BrokerConnectionAdapter {
  id: 'zerodha' | 'upstox' | 'dhan'
  label: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  getConnectionStatus(): Promise<BrokerConnectionStatus>
}

export class MockBrokerConnectionAdapter implements BrokerConnectionAdapter {
  private status: BrokerConnectionStatus = 'not_connected'
  readonly id: BrokerConnectionAdapter['id']
  readonly label: string
  constructor(id: BrokerConnectionAdapter['id'], label: string) { this.id = id; this.label = label }
  async connect() { this.status = 'connecting'; await Promise.resolve(); this.status = 'connected' }
  async disconnect() { this.status = 'not_connected' }
  async getConnectionStatus() { return this.status }
}

export const brokerAdapters = {
  zerodha: new MockBrokerConnectionAdapter('zerodha', 'Zerodha'),
  upstox: new MockBrokerConnectionAdapter('upstox', 'Upstox'),
  dhan: new MockBrokerConnectionAdapter('dhan', 'Dhan'),
}
