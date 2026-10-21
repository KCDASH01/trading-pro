# Trading Signal Pro

A client/server trading platform with a NestJS authority service and a Manifest V3 Chrome client. The backend owns market-data processing, strategy execution, signal generation, statistics, backtests, and WebSocket broadcasts. The extension owns presentation, chart overlays, notifications, settings, and paper/broker client workflows.

## Windows setup

Requirements: Node.js 20+, Chrome, PostgreSQL 16, and Redis 7. Docker Desktop is the recommended local infrastructure provider.

```powershell
cd C:\Users\91700\Documents\KANHU\trading-signal-pro
npm install
npm run db:generate
npm test
npm run build
```

To install the extension:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `C:\Users\91700\Documents\KANHU\trading-signal-pro\dist`.

Click the toolbar icon for the compact popup. Use **Open dashboard** for the full terminal. Settings are stored in `chrome.storage.local` in extension mode and `localStorage` during Vite development.

The server listens on `http://127.0.0.1:3100`, exposes versioned REST endpoints under `/api/v1`, and broadcasts snapshots on the Socket.IO `/market` namespace. Start it with `npm run dev:server` or build everything and run `npm run start:server`. If unavailable, the extension visibly falls back to its deterministic offline demo engine; that fallback is never production authority.

## First-run onboarding

New users see mobile verification before the product shell. In development, the server returns a clearly labeled mock code, `123456`. The mock provider is automatically unavailable when `NODE_ENV=production`; a real SMS provider must be configured before production deployment. OTP challenges expire after five minutes, resends are rate-limited, invalid attempts are capped, and OTP values are never logged.

Only an opaque, expiring application-session token is saved to `chrome.storage.local`. Logout revokes it server-side. The extension never asks for broker passwords, PINs, OTPs, or TOTP seeds.

## Product areas

- **Signals:** backend-originated professional signal feed with market tabs, filters, strategy statistics, favorites, alerts, and Terminal handoff.
- **Strategies:** 18 independently named, versioned strategy concepts with apply/remove and favorites. Current evaluations use deterministic demo fixtures.
- **Terminal:** the existing candlestick chart, indicator overlays, signals, risk levels, paper trading, and backend-authority status.
- **Settings:** verified account, detected broker, mock authorization state, appearance, notifications, sound, history, market/timeframe, and paper-risk defaults.

Supported broker-site detection is isolated to `kite.zerodha.com`, `tv.upstox.com`, and `web.dhan.co`. Connection actions are safe mock placeholders for future official OAuth flows. Sensitive broker tokens must eventually remain server-side.

## PostgreSQL, Prisma, and Redis

PostgreSQL is the persistent source of truth for users, hashed sessions, preferences, strategies, enrollments, favorites, signals, performance, broker metadata, and paper accounts/orders/trades. Redis is limited to expiring OTP challenges, resend cooldowns, attempt counters, and per-mobile/IP rate limits.

Raw session tokens exist only on the client and during request verification. PostgreSQL stores a SHA-256 token hash. Redis stores an HMAC of OTP challenges, never the plaintext OTP. Authenticated Socket.IO connections pass their token in the handshake `auth` object, are rejected when invalid, and are revalidated during broadcasts.

### Windows with Docker Desktop

```powershell
cd C:\Users\91700\Documents\KANHU\trading-signal-pro
Copy-Item .env.example .env
# Replace OTP_HMAC_SECRET and configure exact production origins before deployment.
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:server
```

Useful database commands:

```powershell
npm run db:generate
npm run db:migrate
npm run db:migrate:dev
npm run db:seed
npm run db:studio
```

Without Docker, install PostgreSQL 16 and Redis 7 separately, create a `trading_signal_pro` database, then update `DATABASE_URL` and `REDIS_URL` in `.env` before running the same migration and seed commands.

The checked-in migration is `prisma/migrations/20261021000000_production_foundation/migration.sql`. The seed upserts the 18 strategy definitions and never creates fake users.

### Environment and OTP

Copy `.env.example`; `.env` is gitignored. Development OTP `123456` is available only when both `NODE_ENV` is not `production` and `DEV_MOCK_OTP_ENABLED=true`. Production configuration requires PostgreSQL, Redis, a strong OTP HMAC secret, exact allowed origins, and a real `OtpProvider` adapter. The included production SMS provider intentionally fails until an authorized vendor is configured.

## Development

```powershell
npm run dev
npm run dev:server
npm run db:migrate
npm run db:seed
npm run typecheck
npm run lint
npm test
npm run build
```

The demo provider creates deterministic, clearly labeled synthetic candles for NIFTY 50, BANK NIFTY, and SENSEX. The backtester fills on the next candle open, applies configurable slippage and fees, and assumes the stop is hit first when stop and target both occur in one candle.

## Safety and limitations

- This is analysis software, not investment advice.
- Calibrated win probability remains hidden until the backend has a separately validated model with sufficient out-of-sample data.
- Broker contracts are disabled stubs. No credentials are bundled and real-money order placement throws an error.
- The TradingView content script opens a companion dashboard and does not use private chart internals.
- US Stocks and Crypto tabs are intentionally unavailable until authorized backend providers exist; the UI does not fabricate data.
- No real SMS or broker OAuth vendor is configured. Production adapters require separately supplied authorized credentials.
- The Prisma CLI dependency currently reports upstream build-tool advisories; it is development-only and is not bundled into `server-dist`.
