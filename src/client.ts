import type { AdpClientConfig, AdpWorkerRaw, AdpCompetency, AdpVacationBalance } from './types.js';
import { loadConfig } from './config/loaders.js';
import { AdpHttpClient } from './http/http-client.js';
import { TokenManager } from './auth/token-manager.js';
import { fetchAllWorkersAsync, fetchWorker } from './operations/workers.js';
import { fetchTalent } from './operations/talent.js';
import { fetchVacationBalances } from './operations/vacation.js';

export class AdpClient {
  private readonly httpClient: AdpHttpClient;
  private readonly tokenManager: TokenManager;
  private readonly log: ((message: string) => void) | null;

  constructor(config?: AdpClientConfig) {
    const resolved = loadConfig(config);
    this.log = resolved.log;

    this.httpClient = new AdpHttpClient(resolved);
    this.tokenManager = new TokenManager(
      resolved.clientId,
      resolved.clientSecret,
      resolved.tokenUrl,
      resolved.log,
    );

    // Wire auth into HTTP client
    this.httpClient.setAuth(
      () => this.tokenManager.getValidToken(this.httpClient),
      () => this.tokenManager.refreshToken(this.httpClient).then(() => {}),
    );
  }

  /** Fetch all workers using ADP's async polling pattern */
  async fetchAllWorkersAsync(): Promise<AdpWorkerRaw[]> {
    return fetchAllWorkersAsync(this.httpClient, this.log);
  }

  /** Fetch a single worker by OID (unmasked) */
  async fetchWorker(oid: string): Promise<AdpWorkerRaw | undefined> {
    return fetchWorker(this.httpClient, oid);
  }

  /** Fetch talent/competency data for a worker */
  async fetchTalent(oid: string): Promise<AdpCompetency[]> {
    return fetchTalent(this.httpClient, oid);
  }

  /** Fetch vacation/time-off balances for a worker */
  async fetchVacationBalances(oid: string): Promise<AdpVacationBalance[]> {
    return fetchVacationBalances(this.httpClient, oid);
  }

  /** Force a token refresh */
  async refreshAuth(): Promise<void> {
    await this.tokenManager.refreshToken(this.httpClient);
  }
}
