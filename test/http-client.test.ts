import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AdpHttpClient } from '../src/http/http-client.js';
import { AdpAPIError } from '../src/errors.js';
import type { ResolvedConfig } from '../src/config/loaders.js';

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(() => Buffer.from('dummy')),
  },
}));

vi.mock('axios', async () => {
  const mockRequest = vi.fn();
  const mockCreate = vi.fn(() => ({ request: mockRequest }));
  return {
    default: {
      create: mockCreate,
      isAxiosError: vi.fn(() => false),
      request: vi.fn(),
    },
  };
});

const config: ResolvedConfig = {
  baseUrl: 'https://api.adp.com',
  tokenUrl: 'https://accounts.adp.com/token',
  certPath: '/fake/cert.pem',
  keyPath: '/fake/key.pem',
  clientId: 'id',
  clientSecret: 'secret',
  timeoutMs: 30000,
  rejectUnauthorized: true,
  log: null,
};

function getMockClient() {
  const results = (axios.create as ReturnType<typeof vi.fn>).mock.results;
  return results[results.length - 1]!.value as { request: ReturnType<typeof vi.fn> };
}

describe('AdpHttpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws if auth not configured', async () => {
    const client = new AdpHttpClient(config);
    // Don't call setAuth
    await expect(client.request('GET', '/test')).rejects.toThrow('Auth not configured');
  });

  describe('401 retry logic', () => {
    it('refreshes token and retries on 401', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();

      let tokenCount = 0;
      const tokenGetter = vi.fn(async () => `token-${++tokenCount}`);
      const tokenRefresher = vi.fn(async () => {});
      client.setAuth(tokenGetter, tokenRefresher);

      // First request: 401 error
      const err401 = new Error('Unauthorized') as Error & { response?: { status: number; headers: Record<string, string> } };
      err401.response = { status: 401, headers: {} };
      (axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
      mockClient.request.mockRejectedValueOnce(err401);

      // Retry request: success
      mockClient.request.mockResolvedValueOnce({
        data: { result: 'ok' },
        headers: {},
      });

      const result = await client.request('GET', '/test');

      expect(result.data).toEqual({ result: 'ok' });
      expect(tokenRefresher).toHaveBeenCalledTimes(1);
      expect(tokenGetter).toHaveBeenCalledTimes(2); // initial + after refresh
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('throws after retry also returns 401', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();

      client.setAuth(
        vi.fn(async () => 'token'),
        vi.fn(async () => {}),
      );

      const make401 = () => {
        const err = new Error('Unauthorized') as Error & { response?: { status: number; headers: Record<string, string> } };
        err.response = { status: 401, headers: {} };
        return err;
      };

      // First request: 401
      (axios.isAxiosError as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(true)   // 401 check in catch
        .mockReturnValueOnce(true);  // isAxiosError in transformError (retry)
      mockClient.request.mockRejectedValueOnce(make401());

      // Retry also 401
      mockClient.request.mockRejectedValueOnce(make401());

      await expect(client.request('GET', '/test')).rejects.toSatisfy((err: AdpAPIError) => {
        expect(err).toBeInstanceOf(AdpAPIError);
        expect(err.code).toBe('AUTH_FAILED');
        return true;
      });
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('throws transformed error on non-401 axios error', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();

      client.setAuth(
        async () => 'token',
        async () => {},
      );

      const err500 = new Error('Server Error') as Error & { response?: { status: number; headers: Record<string, string> } };
      err500.response = { status: 500, headers: {} };
      (axios.isAxiosError as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false) // not 401 check in catch
        .mockReturnValueOnce(true); // isAxiosError in transformError
      mockClient.request.mockRejectedValueOnce(err500);

      await expect(client.request('GET', '/test')).rejects.toBeInstanceOf(AdpAPIError);
    });
  });

  describe('requestNoAuth', () => {
    it('makes unauthenticated request with mTLS agent', async () => {
      const client = new AdpHttpClient(config);

      (axios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { access_token: 'tok' },
        headers: {},
      });

      const result = await client.requestNoAuth('POST', 'https://token-url', null, {
        Authorization: 'Basic abc',
      });

      expect(result.data).toEqual({ access_token: 'tok' });
      expect(axios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://token-url',
          headers: { Authorization: 'Basic abc' },
        }),
      );
    });
  });

  describe('error transformation', () => {
    it('transforms timeout errors', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();
      client.setAuth(async () => 'token', async () => {});

      const errTimeout = new Error('timeout') as Error & { code?: string; response?: unknown };
      errTimeout.code = 'ECONNABORTED';
      (axios.isAxiosError as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false) // not 401
        .mockReturnValueOnce(true); // isAxiosError in transformError
      mockClient.request.mockRejectedValueOnce(errTimeout);

      await expect(client.request('GET', '/test')).rejects.toSatisfy((err: AdpAPIError) => {
        expect(err).toBeInstanceOf(AdpAPIError);
        expect(err.code).toBe('TIMEOUT');
        return true;
      });
    });

    it('transforms network errors', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();
      client.setAuth(async () => 'token', async () => {});

      const errNet = new Error('refused') as Error & { code?: string; response?: unknown };
      errNet.code = 'ECONNREFUSED';
      (axios.isAxiosError as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      mockClient.request.mockRejectedValueOnce(errNet);

      await expect(client.request('GET', '/test')).rejects.toSatisfy((err: AdpAPIError) => {
        expect(err).toBeInstanceOf(AdpAPIError);
        expect(err.code).toBe('NETWORK_ERROR');
        return true;
      });
    });

    it('transforms non-axios Error', async () => {
      const client = new AdpHttpClient(config);
      const mockClient = getMockClient();
      client.setAuth(async () => 'token', async () => {});

      (axios.isAxiosError as ReturnType<typeof vi.fn>).mockReturnValue(false);
      mockClient.request.mockRejectedValueOnce(new Error('some error'));

      await expect(client.request('GET', '/test')).rejects.toSatisfy((err: AdpAPIError) => {
        expect(err).toBeInstanceOf(AdpAPIError);
        expect(err.code).toBe('REQUEST_FAILED');
        return true;
      });
    });
  });
});
