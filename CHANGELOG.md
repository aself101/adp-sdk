# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
