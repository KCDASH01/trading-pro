import { describe, expect, it, vi } from 'vitest'
import { DatabaseService } from './database.service'

describe('Prisma repository contracts',()=>{
  it('creates users through the unique normalized-mobile upsert and initializes preferences/paper account',async()=>{
    const upsert=vi.fn(async(args)=>args.create)
    const database=Object.create(DatabaseService.prototype) as DatabaseService
    Object.defineProperty(database,'user',{value:{upsert}})
    await database.findOrCreateUser('+91','9876543210','+919876543210',new Date(0))
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({where:{mobileNormalized:'+919876543210'},create:expect.objectContaining({preference:{create:{}},paperAccount:{create:expect.any(Object)}})}))
  })
  it('uses a bounded limit plus one and produces a cursor',async()=>{
    const rows=Array.from({length:4},(_,index)=>({id:`signal-${index}`}))
    const findMany=vi.fn(async()=>[...rows])
    const database=Object.create(DatabaseService.prototype) as DatabaseService
    Object.defineProperty(database,'signal',{value:{findMany}})
    const result=await database.listSignals({limit:3})
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({take:4}));expect(result.items).toHaveLength(3);expect(result.nextCursor).toBe('signal-2')
  })
})
