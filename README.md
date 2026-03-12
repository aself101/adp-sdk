# adp-sdk v1.0.0

TypeScript SDK for the ADP Workforce API. Handles mTLS OAuth authentication, async worker polling, and employee data retrieval.

Requires **Node.js >= 18**.

## Installation

```bash
npm install adp-sdk
```

## Quick Start

```typescript
import { AdpClient } from 'adp-sdk';

const client = new AdpClient({
  certPath: '/path/to/cert.pem',
  keyPath: '/path/to/key.pem',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
});

// Fetch all workers (async polling)
const workers = await client.fetchAllWorkersAsync();

// Fetch a single worker
const worker = await client.fetchWorker('associate-oid');

// Fetch talent/competency data
const competencies = await client.fetchTalent('associate-oid');

// Fetch vacation balances
const balances = await client.fetchVacationBalances('associate-oid');
```

## Configuration

Pass config directly or use environment variables:

| Config Field | Env Var | Default |
|---|---|---|
| `certPath` | `ADP_CERT_PATH` | *required* |
| `keyPath` | `ADP_KEY_PATH` | *required* |
| `clientId` | `ADP_CLIENT_ID` | *required* |
| `clientSecret` | `ADP_CLIENT_SECRET` | *required* |
| `baseUrl` | `ADP_BASE_URL` | `https://api.adp.com` |
| `tokenUrl` | `ADP_TOKEN_URL` | `https://accounts.adp.com/auth/oauth/v2/token?grant_type=client_credentials` |
| `timeoutMs` | — | `30000` |
| `rejectUnauthorized` | — | `true` |
| `logger` | — | `null` |

Constructor args take precedence over env vars.

```typescript
const client = new AdpClient({
  certPath: '/path/to/cert.pem',
  keyPath: '/path/to/key.pem',
  clientId: 'id',
  clientSecret: 'secret',
  rejectUnauthorized: false, // for self-signed CAs
  logger: (msg) => console.log(msg),
});
```

## API

### `AdpClient`

- **`fetchAllWorkersAsync()`** — Fetches all workers using ADP's async polling pattern (`Prefer: respond-async`). Returns `Promise<AdpWorker[]>`.
- **`fetchWorker(oid)`** — Fetches a single worker by associate OID with unmasked data. Returns `Promise<AdpWorker | undefined>`.
- **`fetchTalent(oid)`** — Fetches talent/competency data. Returns `Promise<AdpCompetency[]>`.
- **`fetchVacationBalances(oid)`** — Fetches vacation/time-off balances. Returns `Promise<AdpVacationBalance[]>`.
- **`refreshAuth()`** — Forces a token refresh. Useful after credential rotation or to proactively refresh before a burst of requests.

### Error Handling

```typescript
import { AdpAPIError } from 'adp-sdk';

try {
  await client.fetchWorker('oid');
} catch (err) {
  if (err instanceof AdpAPIError) {
    console.log(err.code);            // 'AUTH_FAILED', 'TIMEOUT', etc.
    console.log(err.httpStatus);       // 401, 500, etc.
    console.log(err.endpoint);         // '/hr/v2/workers/oid'
    console.log(err.responseHeaders);  // headers from the failed response
    console.log(err.isRetryable());    // true for 5xx, timeout, network
    console.log(err.isAuthError());    // true for 401/403
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `AUTH_FAILED` | OAuth authentication or authorization failure (401/403) |
| `TOKEN_EXPIRED` | Cached token expired and needs refresh |
| `REQUEST_FAILED` | Generic request failure (non-auth, non-timeout) |
| `TIMEOUT` | Request timed out (ECONNABORTED) |
| `NETWORK_ERROR` | Network-level failure (ECONNREFUSED, ENOTFOUND) |
| `SERVICE_UNAVAILABLE` | Server error (5xx response) |
| `ASYNC_TIMEOUT` | Async worker poll exceeded max attempts |

## Subpath Exports

```typescript
import { AdpClient } from 'adp-sdk';
import type { AdpWorker, AdpCompetency, AdpVacationBalance, AdpClientConfig } from 'adp-sdk/types';
import { AdpAPIError } from 'adp-sdk/errors';
import { findPrimaryWorkAssignment } from 'adp-sdk/utils';
import { API_PATHS, ERROR_CODES } from 'adp-sdk/config';
```

### Utilities

```typescript
import { findPrimaryWorkAssignment } from 'adp-sdk/utils';

const worker = await client.fetchWorker('associate-oid');
if (worker) {
  const primary = findPrimaryWorkAssignment(worker.workAssignments);
  console.log(primary?.jobTitle);
}
```

## How It Works

1. **mTLS Authentication** — Uses client certificate + key for mutual TLS with ADP servers
2. **OAuth Token Management** — Automatically fetches and caches Bearer tokens (1-hour TTL with 100s refresh buffer). Concurrent refresh calls are deduplicated. Consecutive auth failures trigger exponential backoff (circuit breaker after 5 failures).
3. **401 Auto-Retry** — On token rejection, automatically refreshes and retries once
4. **Async Polling** — The bulk worker fetch uses ADP's `respond-async` pattern: initial request triggers processing, then polls the `Link` header URL until results are ready (up to 30 attempts)

## Best Practices

- **Use a single `AdpClient` instance** — The client manages a single token lifecycle with built-in deduplication and caching. Creating multiple instances against the same credentials wastes token requests and bypasses the circuit breaker. Share one instance across your application.
