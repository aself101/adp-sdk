import axios, { type AxiosInstance, type AxiosResponseHeaders, type RawAxiosResponseHeaders } from 'axios';
import https from 'node:https';
import fs from 'node:fs';
import { AdpAPIError } from '../errors.js';
import { ERROR_CODES } from '../config/constants.js';
import type { ResolvedConfig } from '../config/loaders.js';

/** Convert AxiosHeaders to plain Record<string, string> */
function normalizeHeaders(headers: AxiosResponseHeaders | RawAxiosResponseHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (Array.isArray(value)) {
        result[key] = value.join(', ');
      }
    }
  }
  return result;
}

export class AdpHttpClient {
  private readonly client: AxiosInstance;
  private readonly agent: https.Agent;
  private readonly timeoutMs: number;
  private readonly logger: ((message: string) => void) | null;
  private tokenGetter: (() => Promise<string>) | null = null;
  private tokenRefresher: (() => Promise<void>) | null = null;

  constructor(config: ResolvedConfig) {
    this.logger = config.logger;
    this.timeoutMs = config.timeoutMs;

    if (config.rejectUnauthorized === false) {
      const warning = '[adp-sdk] WARNING: rejectUnauthorized is false — TLS certificate verification is disabled. Do not use this in production.';
      if (this.logger) {
        this.logger(warning);
      } else {
        console.warn(warning);
      }
    }

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
  async request<T extends Record<string, unknown>>(
    method: 'GET' | 'POST',
    url: string,
    headers?: Record<string, string>,
  ): Promise<{ data: T; headers: Record<string, string> }> {
    if (!this.tokenGetter) throw new AdpAPIError('Auth not configured', ERROR_CODES.AUTH_FAILED);

    const token = await this.tokenGetter();

    try {
      return await this.doAuthenticatedRequest<T>(method, url, token, headers);
    } catch (err) {
      // On 401, try one token refresh and retry
      if (axios.isAxiosError(err) && err.response?.status === 401 && this.tokenRefresher) {
        this.logger?.('Token rejected (401), refreshing...');
        await this.tokenRefresher();
        const newToken = await this.tokenGetter();

        try {
          return await this.doAuthenticatedRequest<T>(method, url, newToken, headers);
        } catch (retryErr) {
          throw this.transformError(retryErr, url);
        }
      }

      throw this.transformError(err, url);
    }
  }

  /** Unauthenticated request — for token endpoint (uses Basic auth externally) */
  async requestNoAuth<T extends Record<string, unknown>>(
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
        headers: normalizeHeaders(response.headers),
      };
    } catch (err) {
      throw this.transformError(err, url);
    }
  }

  /** Execute a single authenticated request */
  private async doAuthenticatedRequest<T extends Record<string, unknown>>(
    method: 'GET' | 'POST',
    url: string,
    token: string,
    headers?: Record<string, string>,
  ): Promise<{ data: T; headers: Record<string, string> }> {
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
      headers: normalizeHeaders(response.headers),
    };
  }

  /** Transform unknown errors into AdpAPIError */
  private transformError(err: unknown, endpoint: string): AdpAPIError {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const responseHeaders = err.response?.headers ? normalizeHeaders(err.response.headers) : undefined;

      if (status === 401 || status === 403) {
        return new AdpAPIError(`Authentication failed: ${err.message}`, ERROR_CODES.AUTH_FAILED, status, endpoint, undefined, err);
      }
      if (status && status >= 500) {
        return new AdpAPIError(`Server error: ${err.message}`, ERROR_CODES.SERVICE_UNAVAILABLE, status, endpoint, undefined, err);
      }
      if (err.code === 'ECONNABORTED') {
        return new AdpAPIError(`Request timeout: ${err.message}`, ERROR_CODES.TIMEOUT, undefined, endpoint, undefined, err);
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return new AdpAPIError(`Network error: ${err.message}`, ERROR_CODES.NETWORK_ERROR, undefined, endpoint, undefined, err);
      }
      return new AdpAPIError(
        `Request failed: ${err.message}`,
        ERROR_CODES.REQUEST_FAILED,
        status,
        endpoint,
        responseHeaders,
        err,
      );
    }

    if (err instanceof Error) {
      return new AdpAPIError(err.message, ERROR_CODES.REQUEST_FAILED, undefined, endpoint, undefined, err);
    }

    return new AdpAPIError(String(err), ERROR_CODES.REQUEST_FAILED, undefined, endpoint);
  }
}
