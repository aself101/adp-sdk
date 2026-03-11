import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdpClient } from '../../src/client.js';
import type { AdpClientConfig } from '../../src/types.js';

// Mock fs.readFileSync
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

const testConfig: AdpClientConfig = {
  baseUrl: 'https://api.adp.com',
  certPath: '/fake/cert.pem',
  keyPath: '/fake/key.pem',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  tokenUrl: 'https://accounts.adp.com/auth/oauth/v2/token',
};

async function getLatestMockClient() {
  const { default: axios } = await import('axios');
  const results = (axios.create as ReturnType<typeof vi.fn>).mock.results;
  return results[results.length - 1]!.value as { request: ReturnType<typeof vi.fn> };
}

async function setupTokenMock() {
  const { default: axios } = await import('axios');
  (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { access_token: 'tok' },
    headers: {},
  });
}

describe('fetchAllWorkersAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('polls until workers are returned', async () => {
    const { default: axios } = await import('axios');
    await setupTokenMock();

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    // Initial request returns async headers
    mockClient.request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // First poll: 202 still processing
    // isAxiosError is called twice per error: once in request() for 401 check, once in transformError()
    const err202 = new Error('202') as Error & { response?: { status: number; headers: Record<string, string> } };
    err202.response = { status: 202, headers: { 'retry-after': '0' } };
    (axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValueOnce(true).mockReturnValueOnce(true);
    mockClient.request.mockRejectedValueOnce(err202);

    // Second poll: success
    mockClient.request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'W1' }, { associateOID: 'W2' }] },
      headers: {},
    });

    const workers = await client.fetchAllWorkersAsync();

    expect(workers).toHaveLength(2);
    expect(workers[0]!.associateOID).toBe('W1');
    expect(mockClient.request).toHaveBeenCalledTimes(3);
  });

  it('throws after max poll attempts', async () => {
    const { default: axios } = await import('axios');
    await setupTokenMock();

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    // Initial request
    mockClient.request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // All polls return 202
    const err202 = new Error('202') as Error & { response?: { status: number; headers: Record<string, string> } };
    err202.response = { status: 202, headers: { 'retry-after': '0' } };
    (axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValue(true);
    for (let i = 0; i < 30; i++) {
      mockClient.request.mockRejectedValueOnce(err202);
    }

    await expect(client.fetchAllWorkersAsync()).rejects.toThrow('timed out after max poll attempts');
  });

  it('rethrows non-202 errors during polling', async () => {
    const { default: axios } = await import('axios');
    await setupTokenMock();

    const client = new AdpClient(testConfig);
    const mockClient = await getLatestMockClient();

    // Initial request
    mockClient.request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Poll returns 500
    const err500 = new Error('Server Error');
    (axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    mockClient.request.mockRejectedValueOnce(err500);

    await expect(client.fetchAllWorkersAsync()).rejects.toThrow('Server Error');
  });
});
