import { vi } from 'vitest';
import type { AdpClientConfig } from '../src/types.js';

export const testConfig: AdpClientConfig = {
  baseUrl: 'https://api.adp.com',
  certPath: '/fake/cert.pem',
  keyPath: '/fake/key.pem',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  tokenUrl: 'https://accounts.adp.com/auth/oauth/v2/token',
};

/** Get the mock axios instance from the most recent axios.create call */
export async function getLatestMockClient() {
  const { default: axios } = await import('axios');
  const results = (axios.create as ReturnType<typeof vi.fn>).mock.results;
  return results[results.length - 1]!.value as { request: ReturnType<typeof vi.fn> };
}

/** Set up token mock so authenticated requests work */
export async function setupTokenMock() {
  const { default: axios } = await import('axios');
  (axios.request as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { access_token: 'tok' },
    headers: {},
  });
}
