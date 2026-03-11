import type { AdpHttpClient } from '../http/http-client.js';
import { API_PATHS } from '../config/constants.js';

/** Fetch talent/competency data for a worker */
export async function fetchTalent(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<unknown> {
  const result = await httpClient.request<{ associateCompetencies: unknown }>(
    'GET',
    API_PATHS.TALENT(oid),
  );
  return result.data.associateCompetencies;
}
