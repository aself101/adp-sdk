import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpVacationBalance } from '../types.js';
import { API_PATHS, ERROR_CODES } from '../config/constants.js';
import { AdpAPIError } from '../errors.js';

function validateOid(oid: string): void {
  if (!/^[A-Z0-9_-]+$/i.test(oid)) {
    throw new AdpAPIError(`Invalid OID format: ${oid}`, ERROR_CODES.REQUEST_FAILED);
  }
}

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
