import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpWorker } from '../types.js';
import type { AsyncHeaders } from '../types-internal.js';
import { AdpAPIError } from '../errors.js';
import { API_PATHS, ASYNC_POLL_MAX_ATTEMPTS, ERROR_CODES } from '../config/constants.js';
import { validateOid } from '../utils/validation.js';

/** Validate that a poll URL uses HTTPS to prevent redirect attacks */
function validatePollUrl(url: string): void {
  if (!url.startsWith('https://') && !url.startsWith('/')) {
    throw new AdpAPIError('Unsafe async poll URL: must be HTTPS or a relative path', ERROR_CODES.REQUEST_FAILED);
  }
}

function pause(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/** Parse async link and retry-after from response headers */
function parseAsyncHeaders(headers: Record<string, string>): AsyncHeaders {
  const linkHeader = headers['link'] ?? '';
  const rawRetryAfter = headers['retry-after'];
  const parsed = rawRetryAfter !== undefined ? parseFloat(rawRetryAfter) : NaN;
  const retryAfter = !isNaN(parsed) ? parsed : 10;

  const match = linkHeader.match(/<([^>]+)>/);
  const link = match?.[1] ?? linkHeader;

  if (!link) {
    throw new AdpAPIError('ADP async response missing Link header', ERROR_CODES.REQUEST_FAILED);
  }

  return { link, retryAfter };
}

/** Fetch all workers using ADP's async polling pattern */
export async function fetchAllWorkersAsync(
  httpClient: AdpHttpClient,
  logger?: ((message: string) => void) | null,
  maxAttempts: number = ASYNC_POLL_MAX_ATTEMPTS,
): Promise<AdpWorker[]> {
  logger?.('Initiating async worker fetch...');

  // Step 1: Initial request triggers async processing
  const initial = await httpClient.request<Record<string, unknown>>('GET', API_PATHS.WORKERS, {
    roleCode: 'manager',
    Prefer: 'respond-async',
  });

  const { link, retryAfter } = parseAsyncHeaders(initial.headers);
  validatePollUrl(link);
  logger?.(`Async processing started. Polling in ${retryAfter}s...`);

  // Step 2: Wait then poll for results
  await pause(retryAfter);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await httpClient.request<{ workers?: AdpWorker[] }>('GET', link);

    // Data ready — return workers
    if (result.data.workers) {
      logger?.(`Fetched ${result.data.workers.length} workers`);
      return result.data.workers;
    }

    // Still processing (202 or empty response) — parse headers and poll again
    const pollHeaders = result.headers['link'] ? parseAsyncHeaders(result.headers) : null;
    const waitTime = pollHeaders?.retryAfter ?? retryAfter;
    logger?.(`Still processing, retry in ${waitTime}s (attempt ${attempt + 1}/${maxAttempts})`);
    await pause(waitTime);
  }

  throw new AdpAPIError(
    'ADP async worker fetch timed out after max poll attempts',
    ERROR_CODES.ASYNC_TIMEOUT,
  );
}

/** Fetch a single worker by OID (unmasked) */
export async function fetchWorker(
  httpClient: AdpHttpClient,
  oid: string,
): Promise<AdpWorker | undefined> {
  validateOid(oid);
  const result = await httpClient.request<{ workers: AdpWorker[] }>(
    'GET',
    API_PATHS.WORKER(oid),
    { Accept: 'application/json;masked=false' },
  );
  return result.data.workers?.[0];
}
