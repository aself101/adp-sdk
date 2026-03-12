/** ADP API timing constants */
export const TOKEN_TTL_SECONDS = 3600;
export const TOKEN_REFRESH_BUFFER_SECONDS = 100;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const ASYNC_POLL_MAX_ATTEMPTS = 30;

/** ADP API base URLs */
export const DEFAULT_BASE_URL = 'https://api.adp.com';
export const DEFAULT_TOKEN_URL = 'https://accounts.adp.com/auth/oauth/v2/token?grant_type=client_credentials';

/** ADP API endpoint paths */
export const API_PATHS = {
  /** Bulk workers endpoint (`/hr/v2/workers`) */
  WORKERS: '/hr/v2/workers',
  /** Single worker by OID (`/hr/v2/workers/:oid`) */
  WORKER: (oid: string) => `/hr/v2/workers/${oid}`,
  /** Talent/competency data for a worker */
  TALENT: (oid: string) => `/talent/v2/associates/${oid}/associate-competencies`,
  /** Vacation/time-off balance data for a worker */
  VACATION: (oid: string) => `/time/v2/workers/${oid}/time-off-details/time-off-balances`,
} as const;

/** Machine-readable error codes for {@link AdpAPIError.code} */
export const ERROR_CODES = {
  /** OAuth authentication or authorization failure (401/403) */
  AUTH_FAILED: 'AUTH_FAILED',
  /** Cached token expired and needs refresh */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  /** Generic request failure (non-auth, non-timeout) */
  REQUEST_FAILED: 'REQUEST_FAILED',
  /** Request timed out (ECONNABORTED) */
  TIMEOUT: 'TIMEOUT',
  /** Network-level failure (ECONNREFUSED, ENOTFOUND) */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** Server error (5xx response) */
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  /** Async worker poll exceeded max attempts */
  ASYNC_TIMEOUT: 'ASYNC_TIMEOUT',
} as const;
