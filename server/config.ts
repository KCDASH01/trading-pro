import 'dotenv/config'

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production'
  port: number
  databaseUrl: string
  redisUrl: string
  sessionTtlHours: number
  devMockOtpEnabled: boolean
  smsProvider: string
  otpHmacSecret: string
  allowedOrigins: string[]
}

const required = (name: string, fallback?: string) => {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv']
  const production = nodeEnv === 'production'
  const config: AppConfig = {
    nodeEnv,
    port: Number(process.env.PORT ?? 3100),
    databaseUrl: required('DATABASE_URL', production ? undefined : 'postgresql://tsp:tsp_dev_password@localhost:5432/trading_signal_pro?schema=public'),
    redisUrl: required('REDIS_URL', production ? undefined : 'redis://localhost:6379'),
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 168),
    devMockOtpEnabled: !production && process.env.DEV_MOCK_OTP_ENABLED === 'true',
    smsProvider: process.env.SMS_PROVIDER ?? (production ? '' : 'development'),
    otpHmacSecret: required('OTP_HMAC_SECRET', production ? undefined : 'development-only-change-this-32-char-secret'),
    allowedOrigins: required('ALLOWED_ORIGINS', production ? undefined : 'http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean),
  }
  if (!Number.isFinite(config.port) || !Number.isFinite(config.sessionTtlHours) || config.sessionTtlHours <= 0) throw new Error('PORT and SESSION_TTL_HOURS must be valid positive numbers.')
  if (production && (config.devMockOtpEnabled || config.smsProvider === 'development')) throw new Error('Development OTP provider cannot be enabled in production.')
  if (production && config.otpHmacSecret.length < 32) throw new Error('OTP_HMAC_SECRET must contain at least 32 characters in production.')
  return config
}
