import { describe, it, expect, vi } from 'vitest';
import { fetchTalent } from '../../src/operations/talent.js';
import { createMockHttpClient } from '../helpers.js';

describe('fetchTalent', () => {
  it('fetches competencies for a worker OID', async () => {
    const httpClient = createMockHttpClient();
    const competencies = [
      { competencyNameCode: { codeValue: 'Forklift' }, categoryCode: { codeValue: 'Equipment' } },
    ];
    (httpClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { associateCompetencies: competencies },
      headers: {},
    });

    const result = await fetchTalent(httpClient, 'OID123');

    expect(result).toEqual(competencies);
    expect(httpClient.request).toHaveBeenCalledWith(
      'GET',
      '/talent/v2/associates/OID123/associate-competencies',
    );
  });

  it('returns empty array when associateCompetencies is missing from response', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {},
      headers: {},
    });

    const result = await fetchTalent(httpClient, 'OID123');

    expect(result).toEqual([]);
  });
});
