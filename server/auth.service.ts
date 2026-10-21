import { createHash, randomInt, randomBytes } from 'node:crypto'
import type { AppConfig } from './config'
import type { OtpStore } from './otp.store'
import type { OtpProvider } from './otp.provider'
import { AppError } from './app-error'
import { Logger } from '@nestjs/common'

export interface AuthDatabase {
  findOrCreateUser(countryCode: string, mobile: string, mobileNormalized: string, now: Date): Promise<{ id: string; countryCode: string; mobile: string }>
  createSession(userId: string, tokenHash: string, expiresAt: Date, userAgent?: string): Promise<{ id: string }>
  findSession(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: Date; revokedAt: Date | null; user: { id: string; countryCode: string; mobile: string; status: string } } | null>
  findSessionById(id: string): Promise<{ id: string; userId: string; expiresAt: Date; revokedAt: Date | null; user: { id: string; countryCode: string; mobile: string; status: string } } | null>
  touchSession(id: string, now: Date): Promise<void>
  revokeSession(id: string, now: Date): Promise<void>
}

export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  constructor(private readonly database: AuthDatabase, private readonly otpStore: OtpStore, private readonly otpProvider: OtpProvider, private readonly config: AppConfig) {}
  private tokenHash(value: string) { return createHash('sha256').update(value).digest('hex') }
  private normalize(countryCode: string, mobile: string) {
    const code = countryCode.replace(/[^+\d]/g, '')
    const number = mobile.replace(/\D/g, '')
    if (!/^\+\d{1,4}$/.test(code) || number.length < 7 || number.length > 15) throw new AppError('MOBILE_INVALID', 'Enter a valid country code and mobile number.')
    return { countryCode: code, mobile: number, mobileNormalized: `${code}${number}` }
  }
  async sendOtp(countryCode: string, mobile: string, ip = 'unknown') {
    const normalized = this.normalize(countryCode, mobile)
    const otp = this.config.devMockOtpEnabled ? '123456' : randomInt(100000, 1000000).toString()
    const challenge = await this.otpStore.create({ mobileNormalized: normalized.mobileNormalized, otp, ip })
    await this.otpProvider.sendOtp({ countryCode: normalized.countryCode, mobile: normalized.mobile, otp })
    this.logger.log(`OTP dispatched to ***${normalized.mobile.slice(-2)}`)
    return { ...challenge, demo: this.config.devMockOtpEnabled, ...(this.config.devMockOtpEnabled ? { demoOtp: otp } : {}) }
  }
  async verifyOtp(countryCode: string, mobile: string, otp: string, userAgent?: string) {
    const normalized = this.normalize(countryCode, mobile)
    await this.otpStore.verify(normalized.mobileNormalized, otp)
    const now = new Date()
    const user = await this.database.findOrCreateUser(normalized.countryCode, normalized.mobile, normalized.mobileNormalized, now)
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(now.getTime() + this.config.sessionTtlHours * 3_600_000)
    await this.database.createSession(user.id, this.tokenHash(token), expiresAt, userAgent)
    this.logger.log('Application session created')
    return { token, expiresAt: expiresAt.getTime(), user: { id: user.id, countryCode: user.countryCode, mobile: user.mobile, verified: true } }
  }
  async authenticate(header?: string, now = new Date()) {
    const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) throw new AppError('AUTH_REQUIRED', 'Authentication is required.', 401)
    const session = await this.database.findSession(this.tokenHash(token))
    if (!session || session.revokedAt || session.expiresAt <= now || session.user.status !== 'ACTIVE') throw new AppError('SESSION_EXPIRED', 'Session expired or invalid.', 401)
    await this.database.touchSession(session.id, now)
    return { session, user: { id: session.user.id, countryCode: session.user.countryCode, mobile: session.user.mobile, verified: true } }
  }
  async logout(header?: string) { const auth = await this.authenticate(header); await this.database.revokeSession(auth.session.id, new Date()); this.logger.log('Application session revoked'); return { ok: true } }
  async revalidateSession(id: string, now = new Date()) { const session = await this.database.findSessionById(id); if (!session || session.revokedAt || session.expiresAt <= now || session.user.status !== 'ACTIVE') throw new AppError('SESSION_EXPIRED', 'Session expired or invalid.', 401); return session }
}
