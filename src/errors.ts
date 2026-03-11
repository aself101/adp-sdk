/** ADP SDK error class with machine-readable error codes */
export class AdpAPIError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly endpoint?: string;
  readonly responseHeaders?: Record<string, string>;

  constructor(message: string, code: string, httpStatus?: number, endpoint?: string, responseHeaders?: Record<string, string>) {
    super(message);
    this.name = 'AdpAPIError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.endpoint = endpoint;
    this.responseHeaders = responseHeaders;
  }

  /** Whether this error is likely transient and worth retrying */
  isRetryable(): boolean {
    if (this.httpStatus && this.httpStatus >= 500) return true;
    return ['SERVICE_UNAVAILABLE', 'TIMEOUT', 'NETWORK_ERROR'].includes(this.code);
  }

  /** Whether this is an authentication/authorization failure */
  isAuthError(): boolean {
    if (this.httpStatus === 401 || this.httpStatus === 403) return true;
    return ['AUTH_FAILED', 'TOKEN_EXPIRED'].includes(this.code);
  }
}
