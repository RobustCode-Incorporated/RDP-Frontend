import { describe, expect, it } from 'vitest';
import { isTokenExpired } from './jwt';
import { makeTestJwt } from '../test/jwt';

describe('isTokenExpired', () => {
  it('returns false for a token that expires in the future', () => {
    expect(isTokenExpired(makeTestJwt(3600))).toBe(false);
  });

  it('returns true for a token that is already expired', () => {
    expect(isTokenExpired(makeTestJwt(-60))).toBe(true);
  });

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });
});
