import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAllWorkersAsync } from '../../src/operations/workers.js';
import { AdpAPIError } from '../../src/errors.js';
import { createMockHttpClient } from '../helpers.js';

describe('fetchAllWorkersAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('polls until workers are returned', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request returns async headers
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // First poll: still processing (no workers in response)
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Second poll: success
    request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'W1' }, { associateOID: 'W2' }] },
      headers: {},
    });

    const workers = await fetchAllWorkersAsync(httpClient, null);

    expect(workers).toHaveLength(2);
    expect(workers[0]!.associateOID).toBe('W1');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('throws after max poll attempts', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // All polls return no workers
    for (let i = 0; i < 3; i++) {
      request.mockResolvedValueOnce({
        data: {},
        headers: { 'retry-after': '0' },
      });
    }

    await expect(fetchAllWorkersAsync(httpClient, null, 3)).rejects.toThrow('timed out after 3 poll attempts');
  });

  it('rethrows errors during polling', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Poll returns 500 error
    request.mockRejectedValueOnce(
      new AdpAPIError('Server error', 'SERVICE_UNAVAILABLE', 500, '/poll'),
    );

    await expect(fetchAllWorkersAsync(httpClient, null)).rejects.toThrow('Server error');
  });

  it('throws immediately with maxAttempts=0', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    await expect(fetchAllWorkersAsync(httpClient, null, 0)).rejects.toThrow('timed out after 0 poll attempts');
    // Only the initial request should have been made, no poll attempts
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('throws on missing link header', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request with no link header
    request.mockResolvedValueOnce({
      data: {},
      headers: { 'retry-after': '0' },
    });

    await expect(fetchAllWorkersAsync(httpClient, null)).rejects.toThrow('missing Link header');
  });

  it('throws on unsafe http:// poll URL', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request returns an http:// (non-HTTPS) link
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<http://attacker.com/poll>', 'retry-after': '0' },
    });

    await expect(fetchAllWorkersAsync(httpClient, null)).rejects.toThrow('Unsafe async poll URL');
  });

  it('polls multiple times before receiving workers', async () => {
    const httpClient = createMockHttpClient();
    const request = httpClient.request as ReturnType<typeof vi.fn>;

    // Initial request
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Poll: still processing with custom retry-after
    request.mockResolvedValueOnce({
      data: {},
      headers: { link: '<https://api.adp.com/events/async/123>', 'retry-after': '0' },
    });

    // Poll: success
    request.mockResolvedValueOnce({
      data: { workers: [{ associateOID: 'W1' }] },
      headers: {},
    });

    const workers = await fetchAllWorkersAsync(httpClient, null);

    expect(workers).toHaveLength(1);
    expect(request).toHaveBeenCalledTimes(3);
  });
});
