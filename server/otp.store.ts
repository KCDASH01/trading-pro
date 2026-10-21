import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError } from './app-error'
import { RedisService } from './redis.service'

export interface OtpChallengeInput { mobileNormalized: string; otp: string; ip: string; now?: number }
export interface OtpStore {
  create(input: OtpChallengeInput): Promise<{ expiresAt: number; resendAfterSeconds: number }>
  verify(mobileNormalized: string, otp: string, now?: number): Promise<void>
  health(): Promise<boolean>
}

interface StoredChallenge { hash: string; expiresAt: number; attempts: number }
const OTP_TTL_SECONDS = 300
const RESEND_SECONDS = 30
const MAX_ATTEMPTS = 5
const MOBILE_SEND_LIMIT = 8
const IP_SEND_LIMIT = 30

export class RedisOtpStore implements OtpStore {
  constructor(private readonly redis: RedisService, private readonly secret: string) {}
  private key(mobile: string) { return `tsp:otp:mobile:${mobile}` }
  private hash(mobile: string, otp: string) { return createHmac('sha256', this.secret).update(`${mobile}:${otp}`).digest('hex') }
  async create(input: OtpChallengeInput) {
    await this.redis.connect()
    const resendKey = `tsp:otp:cooldown:${input.mobileNormalized}`
    if (await this.redis.client.exists(resendKey)) throw new AppError('OTP_RATE_LIMITED', 'Please wait before requesting another code.', 429)
    const minute = Math.floor((input.now ?? Date.now()) / 3_600_000)
    const mobileLimitKey = `tsp:rate:otp:mobile:${input.mobileNormalized}:${minute}`
    const ipLimitKey = `tsp:rate:otp:ip:${input.ip}:${minute}`
    const results = await this.redis.client.multi().incr(mobileLimitKey).expire(mobileLimitKey, 3600).incr(ipLimitKey).expire(ipLimitKey, 3600).exec()
    const mobileCount = Number(results?.[0]?.[1] ?? 0); const ipCount = Number(results?.[2]?.[1] ?? 0)
    if (mobileCount > MOBILE_SEND_LIMIT || ipCount > IP_SEND_LIMIT) throw new AppError('OTP_RATE_LIMITED', 'Too many verification requests. Try again later.', 429)
    const now = input.now ?? Date.now()
    const challenge: StoredChallenge = { hash: this.hash(input.mobileNormalized, input.otp), expiresAt: now + OTP_TTL_SECONDS * 1000, attempts: 0 }
    await this.redis.client.multi().set(this.key(input.mobileNormalized), JSON.stringify(challenge), 'EX', OTP_TTL_SECONDS).set(resendKey, '1', 'EX', RESEND_SECONDS).exec()
    return { expiresAt: challenge.expiresAt, resendAfterSeconds: RESEND_SECONDS }
  }
  async verify(mobileNormalized: string, otp: string, now = Date.now()) {
    await this.redis.connect()
    const key = this.key(mobileNormalized)
    const raw = await this.redis.client.get(key)
    if (!raw) throw new AppError('OTP_EXPIRED', 'OTP expired. Request a new code.', 400)
    const challenge = JSON.parse(raw) as StoredChallenge
    if (challenge.expiresAt <= now) { await this.redis.client.del(key); throw new AppError('OTP_EXPIRED', 'OTP expired. Request a new code.', 400) }
    if (challenge.attempts >= MAX_ATTEMPTS) { await this.redis.client.del(key); throw new AppError('OTP_RATE_LIMITED', 'Too many invalid attempts. Request a new code.', 429) }
    const actual = Buffer.from(challenge.hash, 'hex'); const supplied = Buffer.from(this.hash(mobileNormalized, otp), 'hex')
    if (actual.length !== supplied.length || !timingSafeEqual(actual, supplied)) {
      challenge.attempts += 1
      const ttl = await this.redis.client.ttl(key)
      await this.redis.client.set(key, JSON.stringify(challenge), 'EX', Math.max(ttl, 1))
      throw new AppError('OTP_INVALID', 'Invalid OTP.', 400)
    }
    await this.redis.client.del(key)
  }
  health() { return this.redis.health() }
}
