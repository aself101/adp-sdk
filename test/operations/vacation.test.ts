import { describe, it, expect, vi } from 'vitest';
import { fetchVacationBalances } from '../../src/operations/vacation.js';
import { createMockHttpClient } from '../helpers.js';

describe('fetchVacationBalances', () => {
  it('fetches vacation balances for a worker OID', async () => {
    const httpClient = createMockHttpClient();
    const balances = [
      {
        timeOffPolicyCode: { codeValue: 'VACATION' },
        availableHoursQuantity: 80,
        usedHoursQuantity: 40,
      },
    ];
    (httpClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { paidTimeOffDetails: balances },
      headers: {},
    });

    const result = await fetchVacationBalances(httpClient, 'OID456');

    expect(result).toEqual(balances);
    expect(httpClient.request).toHaveBeenCalledWith(
      'GET',
      '/time/v2/workers/OID456/time-off-details/time-off-balances',
    );
  });

  it('returns empty array when paidTimeOffDetails is missing from response', async () => {
    const httpClient = createMockHttpClient();
    (httpClient.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {},
      headers: {},
    });

    const result = await fetchVacationBalances(httpClient, 'OID456');

    expect(result).toEqual([]);
  });
});
