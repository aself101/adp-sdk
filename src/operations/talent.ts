import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpCompetency } from '../types.js';
import { API_PATHS, ERROR_CODES } from '../config/constants.js';
import { AdpAPIError } from '../errors.js';

function validateOid(oid: string): void {
  if (!/^[A-Z0-9_-]+$/i.test(oid)) {
    throw new AdpAPIError(`Invalid OID format: ${oid}`, ERROR_CODES.REQUEST_FAILED);
  }
}

/** Fetch talent/competency data for a worker */
export async function fetchTalent(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<AdpCompetency[]> {
  validateOid(oid);
  const result = await httpClient.request<{ associateCompetencies: AdpCompetency[] }>(
    'GET',
    API_PATHS.TALENT(oid),
  );
  return result.data.associateCompetencies ?? [];
}
