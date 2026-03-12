import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpCompetency } from '../types.js';
import { API_PATHS } from '../config/constants.js';
import { validateOid } from '../utils/validation.js';

/** Fetch talent/competency data for a worker */
export async function fetchTalent(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<AdpCompetency[]> {
  validateOid(oid);
  // SAFETY: response shape is a trusted assertion on ADP's documented API contract.
  // The `?? []` fallback handles missing/empty responses gracefully.
  const result = await httpClient.request<{ associateCompetencies: AdpCompetency[] }>(
    'GET',
    API_PATHS.TALENT(oid),
  );
  return result.data.associateCompetencies ?? [];
}
