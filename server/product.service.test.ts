import { describe, expect, it } from 'vitest'
import { ProductService } from './product.service'
import { STRATEGIES } from './strategy.catalog'
import type { DatabaseService } from './database.service'

function fakeDatabase() {
  const enrollments = new Map<string,{applied:boolean;favorite:boolean;notificationsEnabled:boolean}>()
  const signals: any[] = []
  let preference = { theme:'DARK',signalNotifications:true,signalSound:false,soundEffects:false,signalHistory:true,defaultMarket:'INDIA',defaultTimeframe:'15m',riskPercentage:1,paperTradingEnabled:true }
  const strategies = STRATEGIES.map((item) => ({ id:item.id,version:item.version,displayName:item.displayName,category:item.category,enabled:true,metadata:{description:item.description,instrument:item.instrument,timeframe:item.timeframe,settings:item.settings},users:[] as any[] }))
  return {
    listStrategies: async (userId?: string) => strategies.map((item) => ({ ...item, users:userId && enrollments.has(item.id) ? [enrollments.get(item.id)] : [] })),
    getStrategy: async (id:string) => strategies.find((item) => item.id === id) ?? null,
    setUserStrategy: async (_user:string,id:string,_version:string,patch:any) => { enrollments.set(id,{applied:false,favorite:false,notificationsEnabled:true,...enrollments.get(id),...patch}) },
    getPreferences: async () => preference,
    updatePreferences: async (_user:string,patch:any) => { preference={...preference,...(patch.appearance?{theme:patch.appearance.toUpperCase()}:{}),...(patch.defaultRiskPercent?{riskPercentage:Math.min(5,patch.defaultRiskPercent)}:{})}; return preference },
    saveSignal: async (data:any) => { if (!signals.some((item) => item.id === data.id)) signals.push({...data,createdAt:new Date(),updatedAt:new Date()}); return data },
    listSignals: async ({limit,cursor}:{limit:number;cursor?:string}) => { const start=cursor ? signals.findIndex((item)=>item.id===cursor)+1 : 0; const items=[...signals].reverse().slice(start,start+limit); return {items,nextCursor:items.length===limit?items.at(-1)?.id:null} },
    savePerformance: async (data:any) => data,
    getBrokerStatus: async () => [], setBroker: async (_user:string,broker:string,status:string) => ({broker,status}),
  } as unknown as DatabaseService
}

describe('Prisma-backed product service contracts', () => {
  it('loads 18 persisted strategies and preserves enrollment/favorites', async () => {
    const service = new ProductService(fakeDatabase())
    expect(await service.strategies()).toHaveLength(18)
    await service.setMembership('user','subscription','ema-momentum-scalper',true)
    await service.setMembership('user','favorite','ema-momentum-scalper',true)
    expect((await service.strategies('user')).find((item)=>item.id==='ema-momentum-scalper')).toMatchObject({applied:true,favorite:true})
  })
  it('persists preferences through the repository', async () => {
    const service = new ProductService(fakeDatabase())
    await service.updatePreferences('user',{appearance:'light',defaultRiskPercent:99})
    expect(await service.preferences('user')).toMatchObject({appearance:'light',defaultRiskPercent:5})
  })
  it('persists generated signals and returns bounded cursor pages', async () => {
    const service = new ProductService(fakeDatabase())
    await service.refreshSignals('NIFTY','15m')
    const first = await service.signals({limit:5})
    expect(first.items.length).toBeLessThanOrEqual(5); expect(first.items.length).toBeGreaterThan(0); expect(first.items.every((item)=>item.source==='backend-authoritative')).toBe(true)
    const second = await service.signals({limit:5,cursor:first.nextCursor ?? undefined})
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
  })
})
