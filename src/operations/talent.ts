import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpCompetency } from '../types.js';
import { API_PATHS } from '../config/constants.js';

/** Fetch talent/competency data for a worker */
export async function fetchTalent(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<AdpCompetency[]> {
  const result = await httpClient.request<{ associateCompetencies: AdpCompetency[] }>(
    'GET',
    API_PATHS.TALENT(oid),
  );
  return result.data.associateCompetencies;
}
