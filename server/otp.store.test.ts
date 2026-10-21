import { describe, expect, it } from 'vitest'
import { RedisOtpStore } from './otp.store'
import type { RedisService } from './redis.service'

class FakeRedisClient {
  values = new Map<string,string>(); counters = new Map<string,number>(); ttls = new Map<string,number>()
  async exists(key:string){return this.values.has(key)?1:0} async get(key:string){return this.values.get(key)??null} async del(key:string){this.values.delete(key);return 1} async ttl(key:string){return this.ttls.get(key)??300}
  async set(key:string,value:string,_mode?:string,ttl?:number){this.values.set(key,value);if(ttl)this.ttls.set(key,ttl);return 'OK'}
  multi(){const operations:Array<()=>unknown>=[];const chain:any={incr:(key:string)=>{operations.push(()=>{const value=(this.counters.get(key)??0)+1;this.counters.set(key,value);return value});return chain},expire:(key:string,ttl:number)=>{operations.push(()=>{this.ttls.set(key,ttl);return 1});return chain},set:(key:string,value:string,_mode:string,ttl:number)=>{operations.push(()=>{this.values.set(key,value);this.ttls.set(key,ttl);return 'OK'});return chain},exec:async()=>operations.map((operation)=>[null,operation()])};return chain}
  async ping(){return 'PONG'}
}
const service = (client:FakeRedisClient) => ({client,connect:async()=>undefined,health:async()=>true}) as unknown as RedisService
describe('Redis OTP state',()=>{
  it('stores only an HMAC, enforces cooldown, TTL, and attempt limits',async()=>{
    const client=new FakeRedisClient();const store=new RedisOtpStore(service(client),'s'.repeat(32))
    await store.create({mobileNormalized:'+919876543210',otp:'123456',ip:'127.0.0.1',now:1000})
    const raw=client.values.get('tsp:otp:mobile:+919876543210')!;expect(raw).not.toContain('123456')
    await expect(store.create({mobileNormalized:'+919876543210',otp:'123456',ip:'127.0.0.1',now:2000})).rejects.toMatchObject({code:'OTP_RATE_LIMITED'})
    for(let attempt=0;attempt<5;attempt+=1) await expect(store.verify('+919876543210','000000',2000)).rejects.toMatchObject({code:'OTP_INVALID'})
    await expect(store.verify('+919876543210','000000',2000)).rejects.toMatchObject({code:'OTP_RATE_LIMITED'})
  })
  it('expires challenges using the stored timestamp',async()=>{const client=new FakeRedisClient();const store=new RedisOtpStore(service(client),'s'.repeat(32));await store.create({mobileNormalized:'+911234567890',otp:'123456',ip:'ip',now:1000});await expect(store.verify('+911234567890','123456',302000)).rejects.toMatchObject({code:'OTP_EXPIRED'})})
})
