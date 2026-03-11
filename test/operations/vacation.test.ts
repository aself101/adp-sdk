import { describe, it, expect, vi } from 'vitest';
import { fetchVacationBalances } from '../../src/operations/vacation.js';
import type { AdpHttpClient } from '../../src/http/http-client.js';

function createMockHttpClient(): AdpHttpClient {
  return {
    request: vi.fn(),
  } as unknown as AdpHttpClient;
}

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
});
