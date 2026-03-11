import type { AdpHttpClient } from '../http/http-client.js';
import type { AdpWorkerRaw } from '../types.js';
import type { AsyncHeaders } from '../types-internal.js';
import { AdpAPIError } from '../errors.js';
import { API_PATHS, ASYNC_POLL_MAX_ATTEMPTS, ERROR_CODES } from '../config/constants.js';

function pause(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/** Parse async link and retry-after from response headers */
function parseAsyncHeaders(headers: Record<string, string>): AsyncHeaders {
  const linkHeader = headers['link'] ?? '';
  const retryAfter = Number(headers['retry-after'] ?? '10');

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
  log?: ((message: string) => void) | null,
  maxAttempts: number = ASYNC_POLL_MAX_ATTEMPTS,
): Promise<AdpWorkerRaw[]> {
  log?.('Initiating async worker fetch...');

  // Step 1: Initial request triggers async processing
  const initial = await httpClient.request<unknown>('GET', API_PATHS.WORKERS, {
    roleCode: 'manager',
    Prefer: 'respond-async',
  });

  const { link, retryAfter } = parseAsyncHeaders(initial.headers);
  log?.(`Async processing started. Polling in ${retryAfter}s...`);

  // Step 2: Wait then poll for results
  await pause(retryAfter);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await httpClient.request<{ workers: AdpWorkerRaw[] }>('GET', link);
      log?.(`Fetched ${result.data.workers.length} workers`);
      return result.data.workers;
    } catch (err) {
      if (err instanceof AdpAPIError && err.httpStatus === 202 && err.responseHeaders) {
        const pollHeaders = parseAsyncHeaders(err.responseHeaders);
        const waitTime = pollHeaders.retryAfter || retryAfter;
        log?.(`Still processing, retry in ${waitTime}s (attempt ${attempt + 1}/${maxAttempts})`);
        await pause(waitTime);
      } else {
        throw err;
      }
    }
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
): Promise<AdpWorkerRaw | undefined> {
  const result = await httpClient.request<{ workers: AdpWorkerRaw[] }>(
    'GET',
    API_PATHS.WORKER(oid),
    { Accept: 'application/json;masked=false' },
  );
  return result.data.workers?.[0];
}
