import type { AdpHttpClient } from '../http/http-client.js';
import { API_PATHS } from '../config/constants.js';

/** Fetch vacation/time-off balances for a worker */
export async function fetchVacationBalances(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<unknown> {
  const result = await httpClient.request<{ paidTimeOffDetails: unknown }>(
    'GET',
    API_PATHS.VACATION(oid),
  );
  return result.data.paidTimeOffDetails;
}
