/** @internal - not exported via public API */

export interface AdpToken {
  accessToken: string;
  expiresAt: number;
}

export interface AsyncHeaders {
  link: string;
  retryAfter: number;
}
