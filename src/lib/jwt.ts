import { jwtDecode } from 'jwt-decode';

/** Seconds of clock skew tolerated between the browser and the API. */
const CLOCK_SKEW_SECONDS = 30;

/**
 * Returns true when the token cannot be decoded or its `exp` claim is in the past.
 * Tokens without an `exp` claim are treated as non-expiring (the backend still
 * rejects them with 401 if they are invalid, which triggers logout via axios).
 */
export function isTokenExpired(token: string, nowMs: number = Date.now()): boolean {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (typeof exp !== 'number') {
      return false;
    }
    return exp - CLOCK_SKEW_SECONDS <= nowMs / 1000;
  } catch {
    return true;
  }
}
