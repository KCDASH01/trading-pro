import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig } from './config'
const original={...process.env}
afterEach(()=>{process.env={...original}})
describe('validated production configuration',()=>{
  it('requires infrastructure and security configuration in production',()=>{process.env.NODE_ENV='production';delete process.env.DATABASE_URL;delete process.env.REDIS_URL;delete process.env.OTP_HMAC_SECRET;expect(()=>loadConfig()).toThrow('DATABASE_URL')})
  it('only enables mock OTP with an explicit non-production flag',()=>{process.env.NODE_ENV='development';process.env.DEV_MOCK_OTP_ENABLED='true';expect(loadConfig().devMockOtpEnabled).toBe(true);process.env.NODE_ENV='production';process.env.DATABASE_URL='postgresql://example';process.env.REDIS_URL='redis://example';process.env.OTP_HMAC_SECRET='x'.repeat(32);process.env.ALLOWED_ORIGINS='chrome-extension://fixed';process.env.SMS_PROVIDER='production';expect(loadConfig().devMockOtpEnabled).toBe(false)})
})
