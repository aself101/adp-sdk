# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-12

### Added

- `AdpClient.getAuthStatus()` method for observability — returns `{ hasToken, consecutiveFailures, circuitBreakerOpen }`
- `fetchAllWorkersAsync({ maxAttempts })` option to configure async poll limit through the public API
- `CONFIG_ERROR` error code for configuration failures (missing cert/key, invalid settings)
- Prerequisites section in README with ADP Developer Portal link
- `destroy()` and `getAuthStatus()` documented in README API section
- Note clarifying subpath exports are equivalent to main entry point imports

### Changed

- Config-time cert/key read failures now use `CONFIG_ERROR` code instead of `REQUEST_FAILED`
- Cert/key error messages now include actionable fix hints (env var name) without leaking filesystem paths
- `ASYNC_TIMEOUT` error message now includes attempt count and actionable suggestions
- Quick start example uses realistic paths (`./certs/`) and `process.env` instead of placeholder strings
- OID validation moved into `API_PATHS` constructors — impossible to skip regardless of caller
- Circuit breaker backoff ceiling raised from 30s to 300s to resist brute-force token refresh
- Removed `NODE_ENV` production guard for `rejectUnauthorized: false` (was a false security boundary)

### Security

- **Domain allowlist** on `baseUrl` and `tokenUrl` prevents credential exfiltration via environment variable poisoning (default: `.adp.com`)
- Async poll URLs validated against base domain hostname and normalized to prevent path traversal
- Error messages no longer expose filesystem paths (cert/key locations)
- Configurable `allowedDomains` option for custom ADP environments

## [1.0.1] - 2026-03-12

### Changed

- `findPrimaryWorkAssignment` now explicitly returns `undefined` for empty arrays with an early-exit guard
- `retry-after` header parsing uses strict `Number()` instead of `parseFloat()` to reject partial numeric strings (e.g., `"10abc"`)
- `retry-after` values are now clamped to 0–300 seconds; out-of-range values fall back to 10s default
- Extracted shared axios mock setup in `client.test.ts` into reusable `setupTokenMock` helper

### Fixed

- `TokenManager.clearToken()` now zeros the cached access token string before nullifying the reference
- Removed extraneous planning markdown files from project root

### Added

- `TokenManager.destroy()` method for zeroing all credentials and cached state on shutdown
- `ERROR_CODES` reference table in README documentation

### Security

- Credential zeroing in `TokenManager` prevents sensitive data lingering in memory after cleanup

## [1.0.0] - 2026-03-11

### Added

- `AdpClient` class with `fetchAllWorkersAsync`, `fetchWorker`, `fetchTalent`, `fetchVacationBalances`, and `refreshAuth` methods
- mTLS OAuth2 authentication with automatic token caching and refresh (3600s TTL, 100s refresh buffer)
- Concurrent token refresh deduplication via promise sharing
- Automatic 401 retry with token refresh on authentication failures
- Async polling pattern for worker data (`Prefer: respond-async` with up to 30 polling attempts)
- `AdpAPIError` with machine-readable error codes, `isRetryable()`, and `isAuthError()` helpers
- `findPrimaryWorkAssignment` utility exported via `adp-sdk/utils` subpath
- `API_PATHS` and `ERROR_CODES` constants exported via `adp-sdk/config` subpath
- Full TypeScript type definitions for all ADP API response shapes
- `rejectUnauthorized` configuration option for SSL certificate verification control (defaults to `true`)
- OID format validation to prevent URL path injection
- Async poll URL HTTPS validation to prevent redirect attacks
- Comprehensive test suite (41 tests across 9 files)
- README documentation with installation, quick start, configuration reference, and API docs
