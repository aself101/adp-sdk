import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpToken } from '../types-internal.js';
import { TOKEN_TTL_SECONDS, TOKEN_REFRESH_BUFFER_SECONDS } from '../config/constants.js';

export class TokenManager {
  private readonly clientIdAndSecretBase64: string;
  private readonly tokenUrl: string;
  private readonly log: ((message: string) => void) | null;
  private token: AdpToken | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(clientId: string, clientSecret: string, tokenUrl: string, log: ((message: string) => void) | null) {
    this.clientIdAndSecretBase64 = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    this.tokenUrl = tokenUrl;
    this.log = log;
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

  /** Invalidate cached token */
  clearToken(): void {
    this.token = null;
  }

  private async doRefresh(httpClient: AdpHttpClient): Promise<string> {
    this.log?.('Fetching ADP bearer token...');

    const response = await httpClient.requestNoAuth<{ access_token: string }>(
      'POST',
      this.tokenUrl,
      null,
      { Authorization: `Basic ${this.clientIdAndSecretBase64}` },
    );

    const accessToken = response.data.access_token;
    const expiresAt = Date.now() + (TOKEN_TTL_SECONDS - TOKEN_REFRESH_BUFFER_SECONDS) * 1000;

    this.token = { accessToken, expiresAt };
    this.log?.('ADP bearer token acquired');

    return accessToken;
  }
}
