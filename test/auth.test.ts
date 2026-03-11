import { describe, it, expect, vi } from 'vitest';
import { TokenManager } from '../src/auth/token-manager.js';
import { AdpAPIError } from '../src/errors.js';
import type { AdpHttpClient } from '../src/http/http-client.js';

function createMockHttpClient(): AdpHttpClient {
  return {
    requestNoAuth: vi.fn().mockResolvedValue({
      data: { access_token: 'mock-token-123' },
      headers: {},
    }),
  } as unknown as AdpHttpClient;
}

describe('TokenManager', () => {
  it('fetches a token on first call', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('client-id', 'client-secret', 'https://token-url', null);

    const token = await tm.getValidToken(httpClient);

    expect(token).toBe('mock-token-123');
    expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(1);
  });

  it('caches token on subsequent calls', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('client-id', 'client-secret', 'https://token-url', null);

    await tm.getValidToken(httpClient);
    await tm.getValidToken(httpClient);

    expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(1);
  });

  it('sends base64-encoded credentials', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('my-id', 'my-secret', 'https://token-url', null);

    await tm.getValidToken(httpClient);

    const expectedBase64 = Buffer.from('my-id:my-secret').toString('base64');
    expect(httpClient.requestNoAuth).toHaveBeenCalledWith(
      'POST',
      'https://token-url',
      null,
      { Authorization: `Basic ${expectedBase64}` },
    );
  });

  it('clearToken forces re-fetch', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('id', 'secret', 'https://token-url', null);

    await tm.getValidToken(httpClient);
    tm.clearToken();
    await tm.getValidToken(httpClient);

    expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(2);
  });

  it('re-fetches token when expired', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('id', 'secret', 'https://token-url', null);

    // First call fetches token
    await tm.getValidToken(httpClient);
    expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(1);

    // Simulate token expiry by advancing Date.now past the TTL
    const realNow = Date.now;
    Date.now = () => realNow() + 4000 * 1000; // 4000s > TTL(3600) - buffer(100)

    try {
      (httpClient.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { access_token: 'refreshed-token' },
        headers: {},
      });

      const token = await tm.getValidToken(httpClient);
      expect(token).toBe('refreshed-token');
      expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realNow;
    }
  });

  it('re-fetches token at exact expiry boundary', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('id', 'secret', 'https://token-url', null);

    // First call fetches token
    const realNow = Date.now;
    const startTime = realNow();
    Date.now = () => startTime;

    try {
      await tm.getValidToken(httpClient);
      expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(1);

      // Advance to exactly the expiry boundary: TTL(3600) - buffer(100) = 3500s
      Date.now = () => startTime + 3500 * 1000;

      (httpClient.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { access_token: 'boundary-token' },
        headers: {},
      });

      const token = await tm.getValidToken(httpClient);
      expect(token).toBe('boundary-token');
      expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realNow;
    }
  });

  it('deduplicates concurrent refresh calls', async () => {
    const httpClient = createMockHttpClient();
    const tm = new TokenManager('id', 'secret', 'https://token-url', null);

    // Fire two concurrent refresh calls
    const [t1, t2] = await Promise.all([
      tm.refreshToken(httpClient),
      tm.refreshToken(httpClient),
    ]);

    expect(t1).toBe('mock-token-123');
    expect(t2).toBe('mock-token-123');
    // Should only have made one actual request
    expect(httpClient.requestNoAuth).toHaveBeenCalledTimes(1);
  });

  it('throttles after consecutive auth failures', async () => {
    const httpClient = {
      requestNoAuth: vi.fn().mockRejectedValue(new AdpAPIError('Unauthorized', 'AUTH_FAILED', 401)),
    } as unknown as AdpHttpClient;
    const tm = new TokenManager('bad-id', 'bad-secret', 'https://token-url', null);

    // First failure goes through
    await expect(tm.refreshToken(httpClient)).rejects.toThrow('Unauthorized');

    // Second call within cooldown window should be throttled
    await expect(tm.refreshToken(httpClient)).rejects.toThrow('Token refresh throttled');
  });

  it('resets failure counter on successful refresh', async () => {
    const httpClient = {
      requestNoAuth: vi.fn()
        .mockRejectedValueOnce(new AdpAPIError('Unauthorized', 'AUTH_FAILED', 401))
        .mockResolvedValueOnce({ data: { access_token: 'recovered-token' }, headers: {} }),
    } as unknown as AdpHttpClient;
    const tm = new TokenManager('id', 'secret', 'https://token-url', null);

    // First call fails
    await expect(tm.refreshToken(httpClient)).rejects.toThrow('Unauthorized');

    // Advance past cooldown (2^1 = 2s)
    const realNow = Date.now;
    Date.now = () => realNow() + 3000;
    try {
      // Second call succeeds
      const token = await tm.refreshToken(httpClient);
      expect(token).toBe('recovered-token');

      // Third call should not be throttled (counter reset)
      (httpClient.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { access_token: 'another-token' },
        headers: {},
      });
      // Reset Date.now so no cooldown applies
      Date.now = realNow;
      tm.clearToken();
      const token2 = await tm.getValidToken(httpClient);
      expect(token2).toBe('another-token');
    } finally {
      Date.now = realNow;
    }
  });
});
