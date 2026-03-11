import { describe, it, expect } from 'vitest';
import { AdpAPIError } from '../src/errors.js';

describe('AdpAPIError', () => {
  it('stores code, httpStatus, endpoint, and responseHeaders', () => {
    const err = new AdpAPIError('fail', 'AUTH_FAILED', 401, '/test', { 'x-foo': 'bar' });
    expect(err.message).toBe('fail');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.httpStatus).toBe(401);
    expect(err.endpoint).toBe('/test');
    expect(err.responseHeaders).toEqual({ 'x-foo': 'bar' });
    expect(err.name).toBe('AdpAPIError');
  });

  describe('isRetryable', () => {
    it('returns true for 5xx', () => {
      expect(new AdpAPIError('', 'REQUEST_FAILED', 500).isRetryable()).toBe(true);
      expect(new AdpAPIError('', 'REQUEST_FAILED', 503).isRetryable()).toBe(true);
    });

    it('returns true for transient error codes', () => {
      expect(new AdpAPIError('', 'SERVICE_UNAVAILABLE').isRetryable()).toBe(true);
      expect(new AdpAPIError('', 'TIMEOUT').isRetryable()).toBe(true);
      expect(new AdpAPIError('', 'NETWORK_ERROR').isRetryable()).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(new AdpAPIError('', 'AUTH_FAILED', 401).isRetryable()).toBe(false);
      expect(new AdpAPIError('', 'REQUEST_FAILED', 400).isRetryable()).toBe(false);
    });
  });

  describe('isAuthError', () => {
    it('returns true for 401/403', () => {
      expect(new AdpAPIError('', 'REQUEST_FAILED', 401).isAuthError()).toBe(true);
      expect(new AdpAPIError('', 'REQUEST_FAILED', 403).isAuthError()).toBe(true);
    });

    it('returns true for auth error codes', () => {
      expect(new AdpAPIError('', 'AUTH_FAILED').isAuthError()).toBe(true);
      expect(new AdpAPIError('', 'TOKEN_EXPIRED').isAuthError()).toBe(true);
    });

    it('returns false for non-auth errors', () => {
      expect(new AdpAPIError('', 'REQUEST_FAILED', 500).isAuthError()).toBe(false);
    });
  });
});
