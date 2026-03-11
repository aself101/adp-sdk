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
  WORKERS: '/hr/v2/workers',
  WORKER: (oid: string) => `/hr/v2/workers/${oid}`,
  TALENT: (oid: string) => `/talent/v2/associates/${oid}/associate-competencies`,
  VACATION: (oid: string) => `/time/v2/workers/${oid}/time-off-details/time-off-balances`,
} as const;

/** Machine-readable error codes */
export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REQUEST_FAILED: 'REQUEST_FAILED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  ASYNC_TIMEOUT: 'ASYNC_TIMEOUT',
} as const;
