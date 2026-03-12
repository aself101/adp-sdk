import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpVacationBalance } from '../types.js';
import { API_PATHS } from '../config/constants.js';
import { validateOid } from '../utils/validation.js';

/** Fetch vacation/time-off balances for a worker */
export async function fetchVacationBalances(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<AdpVacationBalance[]> {
  validateOid(oid);
  const result = await httpClient.request<{ paidTimeOffDetails: AdpVacationBalance[] }>(
    'GET',
    API_PATHS.VACATION(oid),
  );
  return result.data.paidTimeOffDetails ?? [];
}
