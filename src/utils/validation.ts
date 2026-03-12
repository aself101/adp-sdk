import { AdpAPIError } from '../errors.js';
import { ERROR_CODES } from '../config/constants.js';

/** Validate ADP OID format — alphanumeric, hyphens, and underscores only */
export function validateOid(oid: string): void {
  if (!/^[A-Z0-9_-]+$/i.test(oid)) {
    throw new AdpAPIError(`Invalid OID format: ${oid}`, ERROR_CODES.REQUEST_FAILED);
  }
}
