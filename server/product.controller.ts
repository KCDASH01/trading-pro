import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import type { Timeframe } from '../src/domain/types'
import type { ProductPreferences } from '../src/domain/product'
import { ProductService } from './product.service'
import { MarketGateway } from './market.gateway'
import { SessionAuthGuard } from './session-auth.guard'
import { CurrentUser } from './current-user.decorator'

interface CurrentUserValue { id: string }
@Controller('api/v1')
export class ProductController {
  constructor(@Inject(ProductService) private readonly product: ProductService, @Inject(MarketGateway) private readonly gateway: MarketGateway) {}
  @UseGuards(SessionAuthGuard) @Get('preferences') preferences(@CurrentUser() user: CurrentUserValue) { return this.product.preferences(user.id) }
  @UseGuards(SessionAuthGuard) @Put('preferences') updatePreferences(@CurrentUser() user: CurrentUserValue, @Body() body: Partial<ProductPreferences>) { return this.product.updatePreferences(user.id, body) }
  @UseGuards(SessionAuthGuard) @Get('strategies') strategies(@CurrentUser() user: CurrentUserValue) { return this.product.strategies(user.id) }
  @Get('strategies/:id') strategy(@Param('id') id: string) { return this.product.strategy(id) }
  @Get('strategies/:id/performance') performance(@Param('id') id: string, @Query('symbol') symbol?: string, @Query('timeframe') timeframe?: Timeframe) { return this.product.performance(id, symbol, timeframe) }
  @UseGuards(SessionAuthGuard) @Post('strategies/:id/apply') apply(@CurrentUser() user: CurrentUserValue, @Param('id') id: string) { return this.product.setMembership(user.id, 'subscription', id, true) }
  @UseGuards(SessionAuthGuard) @Delete('strategies/:id/apply') remove(@CurrentUser() user: CurrentUserValue, @Param('id') id: string) { return this.product.setMembership(user.id, 'subscription', id, false) }
  @UseGuards(SessionAuthGuard) @Post('strategies/:id/favorite') favorite(@CurrentUser() user: CurrentUserValue, @Param('id') id: string) { return this.product.setMembership(user.id, 'favorite', id, true) }
  @UseGuards(SessionAuthGuard) @Delete('strategies/:id/favorite') unfavorite(@CurrentUser() user: CurrentUserValue, @Param('id') id: string) { return this.product.setMembership(user.id, 'favorite', id, false) }
  @Get('signals') async signals(@Query() query: Record<string, string>) { await this.product.refreshSignals(query.symbol, query.timeframe as Timeframe | undefined); return this.product.signals(query) }
  @Get('signals/latest') async latest(@Query() query: Record<string, string>) { await this.product.refreshSignals(query.symbol, query.timeframe as Timeframe | undefined); const result = await this.product.signals({ ...query, limit: 1 }); return result.items[0] ?? null }
  @Get('brokers') brokers() { return [{ id: 'zerodha', label: 'Zerodha', authorization: 'mock' }, { id: 'upstox', label: 'Upstox', authorization: 'mock' }, { id: 'dhan', label: 'Dhan', authorization: 'mock' }] }
  @UseGuards(SessionAuthGuard) @Get('brokers/status') brokerStatus(@CurrentUser() user: CurrentUserValue) { return this.product.brokerStatus(user.id) }
  @UseGuards(SessionAuthGuard) @Post('brokers/:broker/connect') async connect(@CurrentUser() user: CurrentUserValue, @Param('broker') broker: string) { const status = await this.product.setBroker(user.id, broker, true); this.gateway.broadcastBrokerStatus(status); return status }
  @UseGuards(SessionAuthGuard) @Post('brokers/:broker/disconnect') async disconnect(@CurrentUser() user: CurrentUserValue, @Param('broker') broker: string) { const status = await this.product.setBroker(user.id, broker, false); this.gateway.broadcastBrokerStatus(status); return status }
}
