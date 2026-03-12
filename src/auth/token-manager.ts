import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpToken } from '../types-internal.js';
import { TOKEN_TTL_SECONDS, TOKEN_REFRESH_BUFFER_SECONDS, ERROR_CODES } from '../config/constants.js';
import { AdpAPIError } from '../errors.js';

/** Maximum consecutive auth failures before requiring a longer cooldown */
const MAX_CONSECUTIVE_FAILURES = 5;

export class TokenManager {
  private readonly clientIdAndSecretBase64: string;
  private readonly tokenUrl: string;
  private readonly logger: ((message: string) => void) | null;
  private token: AdpToken | null = null;
  private refreshPromise: Promise<string> | null = null;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;

  constructor(clientId: string, clientSecret: string, tokenUrl: string, logger: ((message: string) => void) | null) {
    this.clientIdAndSecretBase64 = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    this.tokenUrl = tokenUrl;
    this.logger = logger;
  }

  /** Get a valid token, refreshing if expired or missing */
  async getValidToken(httpClient: AdpHttpClient): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) {
      return this.token.accessToken;
    }
    return this.refreshToken(httpClient);
  }

  /** Force a token refresh (deduplicates concurrent calls) */
  async refreshToken(httpClient: AdpHttpClient): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.doRefresh(httpClient);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Invalidate cached token and zero sensitive fields */
  clearToken(): void {
    if (this.token) {
      this.token.accessToken = '';
      this.token = null;
    }
  }

  /** Zero all credentials and cached state. Call when done with this manager. */
  destroy(): void {
    this.clearToken();
    (this as unknown as { clientIdAndSecretBase64: string }).clientIdAndSecretBase64 = '';
    this.refreshPromise = null;
  }

  private async doRefresh(httpClient: AdpHttpClient): Promise<string> {
    // Enforce backoff cooldown after consecutive failures
    if (this.consecutiveFailures > 0) {
      const cooldownMs = Math.min(2 ** this.consecutiveFailures, 30) * 1000;
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed < cooldownMs) {
        const reason = this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
          ? `Token refresh circuit breaker open after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Retry in ${Math.ceil((cooldownMs - elapsed) / 1000)}s.`
          : `Token refresh throttled after ${this.consecutiveFailures} consecutive failures. Retry in ${Math.ceil((cooldownMs - elapsed) / 1000)}s.`;
        throw new AdpAPIError(reason, ERROR_CODES.AUTH_FAILED);
      }
      // Cooldown elapsed — allow attempt (half-open for circuit breaker)
    }

    this.logger?.('Fetching ADP bearer token...');

    try {
      const response = await httpClient.requestNoAuth<{ access_token: string }>(
        'POST',
        this.tokenUrl,
        null,
        { Authorization: `Basic ${this.clientIdAndSecretBase64}` },
      );

      // SAFETY: response.data shape is trusted via the generic assertion on requestNoAuth<{ access_token: string }>.
      // The explicit !accessToken guard below handles the case where ADP returns 200 without a token.
      const accessToken = response.data.access_token;
      if (!accessToken) {
        throw new AdpAPIError('Token endpoint did not return access_token', ERROR_CODES.AUTH_FAILED);
      }
      const expiresAt = Date.now() + (TOKEN_TTL_SECONDS - TOKEN_REFRESH_BUFFER_SECONDS) * 1000;

      this.token = { accessToken, expiresAt };
      this.consecutiveFailures = 0;
      this.logger?.('ADP bearer token acquired');

      return accessToken;
    } catch (err) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      throw err;
    }
  }
}
