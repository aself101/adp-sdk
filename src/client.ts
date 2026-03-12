import type { AdpClientConfig, AdpWorker, AdpCompetency, AdpVacationBalance } from './types.js';
import { loadConfig } from './config/loaders.js';
import { AdpHttpClient } from './http/http-client.js';
import { TokenManager } from './auth/token-manager.js';
import { fetchAllWorkersAsync, fetchWorker } from './operations/workers.js';
import { fetchTalent } from './operations/talent.js';
import { fetchVacationBalances } from './operations/vacation.js';

/**
 * Client for the ADP Workforce API.
 *
 * Handles mTLS OAuth authentication, automatic token caching/refresh,
 * and async polling for worker data retrieval.
 *
 * @example
 * ```ts
 * const client = new AdpClient({
 *   certPath: '/path/to/cert.pem',
 *   keyPath: '/path/to/key.pem',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 * });
 * const workers = await client.fetchAllWorkersAsync();
 * ```
 */
export class AdpClient {
  private readonly httpClient: AdpHttpClient;
  private readonly tokenManager: TokenManager;
  private readonly logger: ((message: string) => void) | null;

  /**
   * @param config - SDK configuration. Required fields (`certPath`, `keyPath`, `clientId`, `clientSecret`)
   *   can be provided here or via environment variables (`ADP_CERT_PATH`, `ADP_KEY_PATH`, `ADP_CLIENT_ID`, `ADP_CLIENT_SECRET`).
   */
  constructor(config?: AdpClientConfig) {
    const resolved = loadConfig(config);
    this.logger = resolved.logger;

    this.httpClient = new AdpHttpClient(resolved);
    this.tokenManager = new TokenManager(
      resolved.clientId,
      resolved.clientSecret,
      resolved.tokenUrl,
      resolved.logger,
    );

    // Wire auth into HTTP client
    this.httpClient.setAuth(
      () => this.tokenManager.getValidToken(this.httpClient),
      () => this.tokenManager.refreshToken(this.httpClient).then(() => {}),
    );
  }

  /**
   * Fetch all workers using ADP's async polling pattern.
   * Sends `Prefer: respond-async` and polls until data is ready (up to 30 attempts).
   * @returns All worker records from the ADP API
   */
  async fetchAllWorkersAsync(): Promise<AdpWorker[]> {
    return fetchAllWorkersAsync(this.httpClient, this.logger);
  }

  /**
   * Fetch a single worker by OID with unmasked data.
   * @param oid - The associate OID (alphanumeric identifier)
   * @returns Worker data, or `undefined` if not found
   */
  async fetchWorker(oid: string): Promise<AdpWorker | undefined> {
    return fetchWorker(this.httpClient, oid);
  }

  /**
   * Fetch talent/competency data for a worker.
   * @param oid - The associate OID
   * @returns Array of competency records, or empty array if none
   */
  async fetchTalent(oid: string): Promise<AdpCompetency[]> {
    return fetchTalent(this.httpClient, oid);
  }

  /**
   * Fetch vacation/time-off balances for a worker.
   * @param oid - The associate OID
   * @returns Array of time-off balance records, or empty array if none
   */
  async fetchVacationBalances(oid: string): Promise<AdpVacationBalance[]> {
    return fetchVacationBalances(this.httpClient, oid);
  }

  /** Force a token refresh, invalidating the cached token. */
  async refreshAuth(): Promise<void> {
    await this.tokenManager.refreshToken(this.httpClient);
  }
}
