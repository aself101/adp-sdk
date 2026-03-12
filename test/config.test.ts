import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config/loaders.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves config from constructor args', () => {
    const config = loadConfig({
      baseUrl: 'https://custom.adp.com',
      tokenUrl: 'https://custom-token.adp.com',
      certPath: '/path/cert.pem',
      keyPath: '/path/key.pem',
      clientId: 'my-id',
      clientSecret: 'my-secret',
      timeoutMs: 5000,
      rejectUnauthorized: false,
    });

    expect(config.baseUrl).toBe('https://custom.adp.com');
    expect(config.tokenUrl).toBe('https://custom-token.adp.com');
    expect(config.certPath).toBe('/path/cert.pem');
    expect(config.keyPath).toBe('/path/key.pem');
    expect(config.clientId).toBe('my-id');
    expect(config.clientSecret).toBe('my-secret');
    expect(config.timeoutMs).toBe(5000);
    expect(config.rejectUnauthorized).toBe(false);
  });

  it('falls back to env vars when config not provided', () => {
    process.env['ADP_CERT_PATH'] = '/env/cert.pem';
    process.env['ADP_KEY_PATH'] = '/env/key.pem';
    process.env['ADP_CLIENT_ID'] = 'env-id';
    process.env['ADP_CLIENT_SECRET'] = 'env-secret';
    process.env['ADP_BASE_URL'] = 'https://env.adp.com';
    process.env['ADP_TOKEN_URL'] = 'https://env-token.adp.com';

    const config = loadConfig();

    expect(config.certPath).toBe('/env/cert.pem');
    expect(config.keyPath).toBe('/env/key.pem');
    expect(config.clientId).toBe('env-id');
    expect(config.clientSecret).toBe('env-secret');
    expect(config.baseUrl).toBe('https://env.adp.com');
    expect(config.tokenUrl).toBe('https://env-token.adp.com');
  });

  it('throws on missing required fields', () => {
    expect(() => loadConfig()).toThrow('Missing required config "certPath"');
  });

  it('throws with informative message including env var name', () => {
    process.env['ADP_CERT_PATH'] = '/cert.pem';
    process.env['ADP_KEY_PATH'] = '/key.pem';
    // Missing clientId

    expect(() => loadConfig()).toThrow('ADP_CLIENT_ID');
  });

  it('defaults rejectUnauthorized to true', () => {
    const config = loadConfig({
      certPath: '/cert.pem',
      keyPath: '/key.pem',
      clientId: 'id',
      clientSecret: 'secret',
    });

    expect(config.rejectUnauthorized).toBe(true);
  });

  it('passes logger through', () => {
    const logger = vi.fn();
    const config = loadConfig({
      certPath: '/cert.pem',
      keyPath: '/key.pem',
      clientId: 'id',
      clientSecret: 'secret',
      logger,
    });

    expect(config.logger).toBe(logger);
  });

  it('defaults logger to null when not provided', () => {
    const config = loadConfig({
      certPath: '/cert.pem',
      keyPath: '/key.pem',
      clientId: 'id',
      clientSecret: 'secret',
    });

    expect(config.logger).toBeNull();
  });

  it('constructor args take precedence over env vars', () => {
    process.env['ADP_CERT_PATH'] = '/env/cert.pem';
    process.env['ADP_KEY_PATH'] = '/env/key.pem';
    process.env['ADP_CLIENT_ID'] = 'env-id';
    process.env['ADP_CLIENT_SECRET'] = 'env-secret';

    const config = loadConfig({
      certPath: '/arg/cert.pem',
      keyPath: '/arg/key.pem',
      clientId: 'arg-id',
      clientSecret: 'arg-secret',
    });

    expect(config.certPath).toBe('/arg/cert.pem');
    expect(config.clientId).toBe('arg-id');
  });
});
