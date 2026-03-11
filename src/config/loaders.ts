import type { AdpClientConfig } from '../types.js';
import { DEFAULT_BASE_URL, DEFAULT_TOKEN_URL, DEFAULT_TIMEOUT_MS } from './constants.js';

/** Fully resolved configuration (all required fields present) */
export interface ResolvedConfig {
  readonly baseUrl: string;
  readonly tokenUrl: string;
  readonly certPath: string;
  readonly keyPath: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly timeoutMs: number;
  readonly rejectUnauthorized: boolean;
  readonly log: ((message: string) => void) | null;
}

function envOrThrow(key: string, configValue: string | undefined, label: string): string {
  const val = configValue ?? process.env[key];
  if (!val) throw new Error(`ADP SDK: Missing required config "${label}". Set ${key} env var or pass in config.`);
  return val;
}

/** Resolve config from constructor args → env vars → defaults */
export function loadConfig(config?: AdpClientConfig): ResolvedConfig {
  const certPath = envOrThrow('ADP_CERT_PATH', config?.certPath, 'certPath');
  const keyPath = envOrThrow('ADP_KEY_PATH', config?.keyPath, 'keyPath');
  const clientId = envOrThrow('ADP_CLIENT_ID', config?.clientId, 'clientId');
  const clientSecret = envOrThrow('ADP_CLIENT_SECRET', config?.clientSecret, 'clientSecret');

  return {
    baseUrl: config?.baseUrl ?? process.env['ADP_BASE_URL'] ?? DEFAULT_BASE_URL,
    tokenUrl: config?.tokenUrl ?? process.env['ADP_TOKEN_URL'] ?? DEFAULT_TOKEN_URL,
    certPath,
    keyPath,
    clientId,
    clientSecret,
    timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    rejectUnauthorized: config?.rejectUnauthorized ?? true,
    log: config?.logger ?? null,
  };
}
