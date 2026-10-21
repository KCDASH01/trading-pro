import { describe, expect, it } from 'vitest'
import { AuthService, type AuthDatabase } from './auth.service'
import type { OtpStore, OtpChallengeInput } from './otp.store'
import { DevelopmentOtpProvider } from './otp.provider'
import type { AppConfig } from './config'
import { AppError } from './app-error'

class FakeOtpStore implements OtpStore {
  challenge?: { mobile: string; otp: string; expiresAt: number; attempts: number; lastSent: number }
  async create(input: OtpChallengeInput) { const now = input.now ?? Date.now(); if (this.challenge && now - this.challenge.lastSent < 30_000) throw new AppError('OTP_RATE_LIMITED','Please wait',429); this.challenge = { mobile: input.mobileNormalized, otp: input.otp, expiresAt: now + 300_000, attempts: 0, lastSent: now }; return { expiresAt: now + 300_000, resendAfterSeconds: 30 } }
  async verify(mobile: string, otp: string, now = Date.now()) { if (!this.challenge || this.challenge.mobile !== mobile || this.challenge.expiresAt <= now) throw new AppError('OTP_EXPIRED','OTP expired'); if (this.challenge.attempts >= 5) throw new AppError('OTP_RATE_LIMITED','Too many attempts'); if (this.challenge.otp !== otp) { this.challenge.attempts += 1; throw new AppError('OTP_INVALID','Invalid OTP') } this.challenge = undefined }
  async health() { return true }
}
class FakeAuthDatabase implements AuthDatabase {
  user = { id: 'user-1', countryCode: '+91', mobile: '9876543210' }
  session?: { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null; user: { id: string; countryCode: string; mobile: string; status: string } }
  async findOrCreateUser(countryCode: string, mobile: string) { this.user = { id:'user-1',countryCode,mobile }; return this.user }
  async createSession(userId: string, tokenHash: string, expiresAt: Date) { this.session = { id:'session-1',userId,tokenHash,expiresAt,revokedAt:null,user:{...this.user,status:'ACTIVE'} }; return { id:'session-1' } }
  async findSession(tokenHash: string) { return this.session?.tokenHash === tokenHash ? this.session : null }
  async findSessionById(id: string) { return this.session?.id === id ? this.session : null }
  async touchSession() { return Promise.resolve() }
  async revokeSession(_id: string, now: Date) { if (this.session) this.session.revokedAt = now }
}
const config: AppConfig = { nodeEnv:'test',port:3100,databaseUrl:'test',redisUrl:'test',sessionTtlHours:1,devMockOtpEnabled:true,smsProvider:'development',otpHmacSecret:'x'.repeat(32),allowedOrigins:[] }

describe('persistent authentication architecture', () => {
  it('creates an opaque session while persisting only its hash', async () => {
    const database = new FakeAuthDatabase(); const auth = new AuthService(database, new FakeOtpStore(), new DevelopmentOtpProvider(), config)
    expect((await auth.sendOtp('+91','9876543210','127.0.0.1')).demoOtp).toBe('123456')
    const result = await auth.verifyOtp('+91','9876543210','123456','test-agent')
    expect(result.token).toHaveLength(43); expect(database.session?.tokenHash).toMatch(/^[a-f0-9]{64}$/); expect(database.session?.tokenHash).not.toBe(result.token)
    expect((await auth.authenticate(`Bearer ${result.token}`)).user.verified).toBe(true)
    await auth.logout(`Bearer ${result.token}`)
    await expect(auth.authenticate(`Bearer ${result.token}`)).rejects.toMatchObject({ code:'SESSION_EXPIRED' })
  })
  it('enforces invalid attempts, expiration, and resend cooldown', async () => {
    const store = new FakeOtpStore(); const auth = new AuthService(new FakeAuthDatabase(), store, new DevelopmentOtpProvider(), config)
    await auth.sendOtp('+91','9876543210','ip')
    await expect(auth.sendOtp('+91','9876543210','ip')).rejects.toMatchObject({ code:'OTP_RATE_LIMITED' })
    await expect(auth.verifyOtp('+91','9876543210','000000')).rejects.toMatchObject({ code:'OTP_INVALID' })
    if (store.challenge) store.challenge.expiresAt = Date.now() - 1
    await expect(auth.verifyOtp('+91','9876543210','123456')).rejects.toMatchObject({ code:'OTP_EXPIRED' })
  })
  it('rejects expired database sessions', async () => {
    const database = new FakeAuthDatabase(); const store = new FakeOtpStore(); const auth = new AuthService(database, store, new DevelopmentOtpProvider(), config)
    await auth.sendOtp('+91','9876543210','ip'); const result = await auth.verifyOtp('+91','9876543210','123456'); if (database.session) database.session.expiresAt = new Date(0)
    await expect(auth.authenticate(`Bearer ${result.token}`)).rejects.toMatchObject({ code:'SESSION_EXPIRED' })
  })
})
