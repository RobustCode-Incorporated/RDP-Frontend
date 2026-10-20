import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { parseApiError } from './errors';
import { apiError } from '../test/mockApi';

describe('parseApiError', () => {
  it('extracts message and translated fieldErrors from the contract body', () => {
    const parsed = parseApiError(apiError(400, 'Validation failed', { customerName: 'Customer name is required', other: 'Raw message' }));
    expect(parsed).toEqual({
      status: 400,
      message: 'Certains champs sont invalides.',
      fieldErrors: { customerName: 'Le nom du client est obligatoire.', other: 'Raw message' },
    });
  });

  it('substitutes captured values', () => {
    expect(parseApiError(apiError(409, 'Cannot change delivery status from DELIVERED to CANCELLED')).message)
      .toBe('Transition impossible (DELIVERED → CANCELLED). La livraison a peut-être changé, rechargez.');
  });

  it('handles network errors and unknown values', () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    expect(parseApiError(new AxiosError('Network Error', 'ERR_NETWORK', config)).status).toBe(0);
    expect(parseApiError('boom', 'Fallback').message).toBe('Fallback');
  });
});
