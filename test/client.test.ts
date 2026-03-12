import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdpClient } from '../src/client.js';
import { testConfig, getLatestMockClient } from './helpers.js';

// Mock fs.readFileSync to return dummy cert/key
vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(() => Buffer.from('dummy')),
  },
}));

// Mock axios
vi.mock('axios', async () => {
  const mockRequest = vi.fn();
  const mockCreate = vi.fn(() => ({ request: mockRequest }));
  const isAxiosError = vi.fn(() => false);

  return {
    default: {
      create: mockCreate,
      isAxiosError,
      request: vi.fn(),
    },
  };
});

describe('AdpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an instance without throwing', () => {
    const client = new AdpClient(testConfig);
    expect(client).toBeDefined();
  });

  it('constructs base64 credentials and fetches token on first request', async () => {
    const { default: axios } = await import('axios');
    const expectedBase64 = Buffer.from('test-client-id:test-client-secret').toString('base64');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    // Token request via requestNoAuth
    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { access_token: 'test-token-123' },
      headers: {},
    });

    // Worker request
    mockClient.request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'ABC' }] },
      headers: {},
    });

    await client.fetchWorker('ABC');

    // Verify token was fetched with correct base64 auth
    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Basic ${expectedBase64}` },
      }),
    );
  });

  it('caches token and reuses on subsequent requests', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    // Token request
    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'cached-token' },
      headers: {},
    });

    mockClient.request.mockResolvedValue({
      data: { workers: [{ associateOID: 'X' }] },
      headers: {},
    });

    await client.fetchWorker('X');
    await client.fetchWorker('Y');

    // Token should only be fetched once
    expect(axios.request).toHaveBeenCalledTimes(1);
    // But two worker requests should have been made
    expect(mockClient.request).toHaveBeenCalledTimes(2);
  });

  it('fetchAllWorkersAsync delegates through client and returns workers', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok' },
      headers: {},
    });

    // Initial async request
    mockClient.request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Poll returns workers
    mockClient.request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'W1' }] },
      headers: {},
    });

    const workers = await client.fetchAllWorkersAsync();

    expect(workers).toHaveLength(1);
    expect(workers[0]!.associateOID).toBe('W1');
  });

  it('fetchTalent delegates through client and returns competencies', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok' },
      headers: {},
    });

    mockClient.request.mockResolvedValueOnce({
      data: { associateCompetencies: [{ competencyID: 'C1' }] },
      headers: {},
    });

    const result = await client.fetchTalent('OID1');

    expect(result).toHaveLength(1);
  });

  it('fetchVacationBalances delegates through client and returns balances', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok' },
      headers: {},
    });

    mockClient.request.mockResolvedValueOnce({
      data: { paidTimeOffDetails: [{ balance: 40 }] },
      headers: {},
    });

    const result = await client.fetchVacationBalances('OID1');

    expect(result).toHaveLength(1);
  });

  it('refreshAuth forces a token refresh', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);

    (axios.request as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        data: { access_token: 'token-1' },
        headers: {},
      })
      .mockResolvedValueOnce({
        data: { access_token: 'token-2' },
        headers: {},
      });

    await client.refreshAuth();
    await client.refreshAuth();

    // Two token requests should have been made (not cached)
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it('fetchWorker returns undefined when workers array is empty', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok' },
      headers: {},
    });

    mockClient.request.mockResolvedValueOnce({
      data: { workers: [] },
      headers: {},
    });

    const result = await client.fetchWorker('NONEXISTENT');

    expect(result).toBeUndefined();
  });

  it('fetchWorker sends unmasked accept header', async () => {
    const { default: axios } = await import('axios');

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok' },
      headers: {},
    });

    mockClient.request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'OID1' }] },
      headers: {},
    });

    await client.fetchWorker('OID1');

    expect(mockClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/hr/v2/workers/OID1',
        headers: expect.objectContaining({
          Accept: 'application/json;masked=false',
        }),
      }),
    );
  });
});
