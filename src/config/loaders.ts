import type { AdpClientConfig } from '../types.js';
import { DEFAULT_BASE_URL, DEFAULT_TOKEN_URL, DEFAULT_TIMEOUT_MS, DEFAULT_ALLOWED_DOMAINS } from './constants.js';

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
  readonly logger: ((message: string) => void) | null;
}

function envOrThrow(key: string, configValue: string | undefined, label: string): string {
  const val = configValue ?? process.env[key];
  if (!val) throw new Error(`ADP SDK: Missing required config "${label}". Set ${key} env var or pass in config.`);
  return val;
}

/**
 * Validate that a URL's hostname ends with an allowed domain suffix.
 * Prevents credential exfiltration via env poisoning or config injection.
 */
function validateUrlDomain(url: string, label: string, allowedDomains: readonly string[]): void {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(`ADP SDK: Invalid ${label} URL: "${url}". Must be a valid HTTPS URL.`);
  }
  if (!url.startsWith('https://')) {
    throw new Error(`ADP SDK: ${label} must use HTTPS. Got: "${url}"`);
  }
  const domainAllowed = allowedDomains.some(suffix => hostname === suffix.slice(1) || hostname.endsWith(suffix));
  if (!domainAllowed) {
    throw new Error(
      `ADP SDK: ${label} hostname "${hostname}" is not in the allowed domains list [${allowedDomains.join(', ')}]. ` +
      'If you use a custom ADP environment, pass allowedDomains in config.',
    );
  }
}

/** Resolve config from constructor args → env vars → defaults */
export function loadConfig(config?: AdpClientConfig): ResolvedConfig {
  const certPath = envOrThrow('ADP_CERT_PATH', config?.certPath, 'certPath');
  const keyPath = envOrThrow('ADP_KEY_PATH', config?.keyPath, 'keyPath');
  const clientId = envOrThrow('ADP_CLIENT_ID', config?.clientId, 'clientId');
  const clientSecret = envOrThrow('ADP_CLIENT_SECRET', config?.clientSecret, 'clientSecret');

  const baseUrl = config?.baseUrl ?? process.env['ADP_BASE_URL'] ?? DEFAULT_BASE_URL;
  const tokenUrl = config?.tokenUrl ?? process.env['ADP_TOKEN_URL'] ?? DEFAULT_TOKEN_URL;
  const allowedDomains = config?.allowedDomains ?? DEFAULT_ALLOWED_DOMAINS;

  validateUrlDomain(baseUrl, 'baseUrl', allowedDomains);
  validateUrlDomain(tokenUrl, 'tokenUrl', allowedDomains);

  return {
    baseUrl,
    tokenUrl,
    certPath,
    keyPath,
    clientId,
    clientSecret,
    timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    rejectUnauthorized: config?.rejectUnauthorized ?? true,
    logger: config?.logger ?? null,
  };
}
