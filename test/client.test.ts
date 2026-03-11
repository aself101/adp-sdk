import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdpClient } from '../src/client.js';
import type { AdpClientConfig } from '../src/types.js';

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
      post: mockPost,
      isAxiosError,
      request: vi.fn(),
    },
  };

  function mockPost() {}
});

const testConfig: AdpClientConfig = {
  baseUrl: 'https://api.adp.com',
  certPath: '/fake/cert.pem',
  keyPath: '/fake/key.pem',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  tokenUrl: 'https://accounts.adp.com/auth/oauth/v2/token',
};

/** Helper: get the mock axios instance from the most recent axios.create call */
async function getLatestMockClient() {
  const { default: axios } = await import('axios');
  const results = (axios.create as ReturnType<typeof vi.fn>).mock.results;
  return results[results.length - 1]!.value as { request: ReturnType<typeof vi.fn> };
}

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
