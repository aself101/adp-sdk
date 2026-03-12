import { describe, it, expect } from 'vitest';
import { validateOid } from '../../src/utils/validation.js';
import { AdpAPIError } from '../../src/errors.js';

describe('validateOid', () => {
  it('accepts valid alphanumeric OIDs', () => {
    expect(() => validateOid('ABC123')).not.toThrow();
    expect(() => validateOid('WORKER_123-ABC')).not.toThrow();
    expect(() => validateOid('a1b2c3')).not.toThrow();
  });

  it('throws on OID with spaces', () => {
    expect(() => validateOid('BAD OID')).toThrow(AdpAPIError);
    expect(() => validateOid('BAD OID')).toThrow('Invalid OID format');
  });

  it('throws on OID with special characters', () => {
    expect(() => validateOid('OID@123')).toThrow(AdpAPIError);
    expect(() => validateOid('OID/path')).toThrow(AdpAPIError);
    expect(() => validateOid('OID;DROP')).toThrow(AdpAPIError);
  });

  it('throws on empty string', () => {
    expect(() => validateOid('')).toThrow(AdpAPIError);
    expect(() => validateOid('')).toThrow('Invalid OID format');
  });

  it('includes expected format hint in error message', () => {
    expect(() => validateOid('bad!oid')).toThrow('alphanumeric characters, hyphens, or underscores only');
  });
});
