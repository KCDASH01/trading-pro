# Trading Signal Pro progress

Last updated: 2026-10-21

## Authority boundary

The NestJS service is the production source of truth for market-data processing, indicators, strategies, signals, statistics, and backtests. The extension consumes REST and Socket.IO snapshots. Its local quantitative engine is restricted to an explicitly identified offline/demo fallback.

## Completed

- **Product experience:** deterministic startup state machine; first-run mobile/OTP onboarding; session restore, expiration, and logout; compact popup and responsive full-page shell with Signals, Strategies, Terminal, and Settings.
- **Broker UX:** isolated Zerodha/Upstox/Dhan active-tab detection, tab-change reactions, normalized detection model, mock adapter interface, safe connection metadata, and explicit no-credential guidance.
- **Signals and notifications:** backend feed, India/US/Crypto market tabs, nine filters, original signal cards, Terminal handoff, in-app toast, Chrome notification dispatch, and persisted server-signal deduplication.
- **Strategy catalog:** 18 server-owned versioned strategy families, performance evaluation models, apply/remove, favorites, and demo-fixture disclosure.
- **Production persistence foundation:** PostgreSQL/Prisma schema and migration for users, hashed sessions, preferences, versioned strategies, enrollments, signals, performance, broker metadata, and Decimal-safe paper accounts/orders/trades.
- **Redis operations:** HMAC-protected OTP challenges, TTL, resend cooldown, verification attempts, mobile/IP rate limiting, and health reporting.
- **Authentication hardening:** explicit development OTP flag, provider abstraction, 256-bit tokens, database token hashes, session expiry/revocation/last-seen, reusable guard/user decorator, authenticated Socket.IO handshakes, and stable API error codes.
- **Deployment foundation:** validated environment configuration, `.env.example`, Docker Compose for PostgreSQL/Redis, generated Prisma migration, strategy seed, Helmet, restrictive CORS, structured safe logging, health/readiness endpoints, and graceful client shutdown.
- **Milestone 1:** NestJS REST/WebSocket authority service; Manifest V3 API client, popup, dashboard, options page, service worker, companion content script, terminal UI, deterministic demo data, persistence, production builds.
- **Milestone 2:** Lightweight Charts candlesticks and EMA overlays; EMA, Wilder RSI, MACD, Wilder ATR, and Supertrend implemented from scratch with insufficient-data handling and tests.
- **Milestone 3:** Closed-candle BUY/SELL rules, ATR-based entry/stop/target, agreement score, signal markers and history, duplicate-resistant IDs.
- **Milestone 4:** Next-candle-open backtester with slippage, fees, risk sizing, conservative intrabar collision policy, drawdown, profit factor, expectancy, and trade history.
- **Milestone 5:** Persisted virtual account positions and duplicate paper-order prevention. Live order execution is disabled.
- **Milestone 7 foundation:** Provider, broker, and external-chart interfaces. TradingView integration is a public companion launcher only.

## Verification

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed; extension entries produced in `dist`
- `npm run db:generate`: passed with Prisma Client 6.19.0
- Prisma migration SQL: generated (250 lines); live apply blocked because no PostgreSQL/Docker runtime is installed locally
- `npm run typecheck`: passed for extension and server
- `npm run lint`: passed
- `npm test`: passed, 11 suites / 28 tests including Prisma contracts, Redis OTP controls, session hashing/revocation, configuration, persistence, pagination, and existing trading/extension coverage
- NestJS runtime smoke test: passed startup, all REST route registrations, gateway registration, and recurring broadcast interval without error

## Remaining work

- CSV import UI, monthly performance visualization, position exit monitoring, journal editing, and complete analytics subpages.
- Chronological/walk-forward probability calibration pipeline, reliability diagram, Brier score, sample-size gate, and model-version persistence.
- Authorized market-data adapters and OAuth-backed broker integrations after credentials, entitlements, and explicit live-trading authorization are supplied.
- Production SMS provider, server-side broker token vault/KMS integration, refresh-token rotation, and authorized live market-data adapters.

## Known limitations

- Demo candles are synthetic and fixed; they are not current market quotes.
- PostgreSQL/Redis integration could not be executed in this workspace because Docker, PostgreSQL, and Redis are not installed; the migration command correctly reached the configured datasource and failed to connect.
- Development OTP `123456` requires the explicit non-production `DEV_MOCK_OTP_ENABLED=true` flag and remains visibly labeled in onboarding.
- Prisma 6 CLI transitive build tooling currently has four upstream high-severity audit advisories; the CLI is a development dependency and is not included in the backend bundle. A controlled Prisma 7 migration remains follow-up work.
- The service worker intentionally does not maintain a persistent WebSocket.
- No claim of profitability is made; displayed results are illustrative synthetic-data output.
