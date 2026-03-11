import axios, { type AxiosInstance } from 'axios';
import https from 'node:https';
import fs from 'node:fs';
import { AdpAPIError } from '../errors.js';
import { ERROR_CODES } from '../config/constants.js';
import type { ResolvedConfig } from '../config/loaders.js';

export class AdpHttpClient {
  private readonly client: AxiosInstance;
  private readonly agent: https.Agent;
  private readonly timeoutMs: number;
  private readonly log: ((message: string) => void) | null;
  private tokenGetter: (() => Promise<string>) | null = null;
  private tokenRefresher: (() => Promise<void>) | null = null;

  constructor(config: ResolvedConfig) {
    this.log = config.log;
    this.timeoutMs = config.timeoutMs;

    this.agent = new https.Agent({
      cert: fs.readFileSync(config.certPath),
      key: fs.readFileSync(config.keyPath),
      rejectUnauthorized: config.rejectUnauthorized,
    });

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      httpsAgent: this.agent,
    });
  }

  /** Wire auth callbacks (called by client after TokenManager is constructed) */
  setAuth(
    tokenGetter: () => Promise<string>,
    tokenRefresher: () => Promise<void>,
  ): void {
    this.tokenGetter = tokenGetter;
    this.tokenRefresher = tokenRefresher;
  }

  /** Authenticated request — injects Bearer token */
  async request<T>(
    method: 'GET' | 'POST',
    url: string,
    headers?: Record<string, string>,
  ): Promise<{ data: T; headers: Record<string, string> }> {
    if (!this.tokenGetter) throw new AdpAPIError('Auth not configured', ERROR_CODES.AUTH_FAILED);

    const token = await this.tokenGetter();

    try {
      const response = await this.client.request<T>({
        method,
        url,
        headers: {
          Authorization: `Bearer ${token}`,
          ...headers,
        },
      });

      return {
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (err) {
      // On 401, try one token refresh and retry
      if (axios.isAxiosError(err) && err.response?.status === 401 && this.tokenRefresher) {
        this.log?.('Token rejected (401), refreshing...');
        await this.tokenRefresher();
        const newToken = await this.tokenGetter();

        const response = await this.client.request<T>({
          method,
          url,
          headers: {
            Authorization: `Bearer ${newToken}`,
            ...headers,
          },
        });

        return {
          data: response.data,
          headers: response.headers as Record<string, string>,
        };
      }

      throw this.transformError(err, url);
    }
  }

  /** Unauthenticated request — for token endpoint (uses Basic auth externally) */
  async requestNoAuth<T>(
    method: 'POST',
    url: string,
    data?: unknown,
    headers?: Record<string, string>,
  ): Promise<{ data: T; headers: Record<string, string> }> {
    try {
      const response = await axios.request<T>({
        method,
        url,
        data,
        headers,
        httpsAgent: this.agent,
        timeout: this.timeoutMs,
      });

      return {
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (err) {
      throw this.transformError(err, url);
    }
  }

  /** Transform unknown errors into AdpAPIError */
  private transformError(err: unknown, endpoint: string): AdpAPIError {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const responseHeaders = err.response?.headers as Record<string, string> | undefined;

      if (status === 401 || status === 403) {
        return new AdpAPIError(`Authentication failed: ${err.message}`, ERROR_CODES.AUTH_FAILED, status, endpoint);
      }
      if (status && status >= 500) {
        return new AdpAPIError(`Server error: ${err.message}`, ERROR_CODES.SERVICE_UNAVAILABLE, status, endpoint);
      }
      if (err.code === 'ECONNABORTED') {
        return new AdpAPIError(`Request timeout: ${err.message}`, ERROR_CODES.TIMEOUT, undefined, endpoint);
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return new AdpAPIError(`Network error: ${err.message}`, ERROR_CODES.NETWORK_ERROR, undefined, endpoint);
      }
      return new AdpAPIError(
        `Request failed: ${err.message}`,
        ERROR_CODES.REQUEST_FAILED,
        status,
        endpoint,
        responseHeaders,
      );
    }

    if (err instanceof Error) {
      return new AdpAPIError(err.message, ERROR_CODES.REQUEST_FAILED, undefined, endpoint);
    }

    return new AdpAPIError(String(err), ERROR_CODES.REQUEST_FAILED, undefined, endpoint);
  }
}
