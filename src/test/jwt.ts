const base64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Builds an unsigned test JWT whose `exp` is `expiresInSeconds` from now. */
export const makeTestJwt = (expiresInSeconds: number) =>
  `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url({
    sub: 'user@test.com',
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  })}.signature`;
