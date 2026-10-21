import { Inject, Logger } from '@nestjs/common'
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import type { Namespace, Socket } from 'socket.io'
import type { StrategySettings } from '../src/domain/types'
import { TradingService } from './trading.service'
import { AuthService } from './auth.service'
import { loadConfig } from './config'

interface Subscription { symbol?: string; timeframe?: string; settings?: Partial<StrategySettings> }
const gatewayConfig = loadConfig()

@WebSocketGateway({ namespace: '/market', cors: { origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => { const allowed = !origin || gatewayConfig.allowedOrigins.includes(origin) || gatewayConfig.nodeEnv !== 'production' && origin.startsWith('chrome-extension://'); callback(allowed ? null : new Error('Origin not allowed.'), allowed) }, credentials: false } })
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Namespace
  private readonly logger = new Logger(MarketGateway.name)
  constructor(@Inject(TradingService) private readonly trading: TradingService, @Inject(AuthService) private readonly auth: AuthService) {}
  async handleConnection(client: Socket) {
    const token = typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : ''
    try { const authenticated = await this.auth.authenticate(token ? `Bearer ${token}` : undefined); client.data.sessionId = authenticated.session.id; client.data.userId = authenticated.user.id; this.logger.log('WebSocket authenticated') }
    catch { client.emit('session:expired'); client.disconnect(true); this.logger.warn('WebSocket authentication rejected') }
  }
  handleDisconnect() { this.logger.log('WebSocket disconnected') }
  @SubscribeMessage('subscribe')
  subscribe(@MessageBody() request: Subscription, @ConnectedSocket() client: Socket) {
    if (!client.data.sessionId) return { event: 'session:expired', data: null }
    client.data.subscription = request
    const snapshot = this.trading.snapshot(request.symbol, request.timeframe, request.settings)
    client.data.lastSignalId = snapshot.signals.at(-1)?.id
    client.emit('snapshot', snapshot)
    return { event: 'subscribed', data: { symbol: snapshot.symbol, timeframe: snapshot.timeframe, source: snapshot.source } }
  }
  async broadcastSnapshots() {
    for (const socket of this.server.sockets.values()) {
      try { await this.auth.revalidateSession(String(socket.data.sessionId)) }
      catch { socket.emit('session:expired'); socket.disconnect(true); continue }
      const request = (socket.data.subscription ?? {}) as Subscription
      const snapshot = this.trading.snapshot(request.symbol, request.timeframe, request.settings)
      socket.emit('snapshot', snapshot)
      socket.emit('signal:update', snapshot.signals.slice(-5))
      const latest = snapshot.signals.at(-1)
      if (latest && latest.id !== socket.data.lastSignalId) { socket.data.lastSignalId = latest.id; socket.emit('signal:new', { ...latest, source: snapshot.source }) }
      socket.emit('strategy:performance', { strategyVersion: snapshot.strategyVersion, statistics: snapshot.backtest })
    }
  }
  broadcastBrokerStatus(status: unknown) { this.server.emit('broker:status', status) }
}
