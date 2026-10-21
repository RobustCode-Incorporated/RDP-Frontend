import { describe, expect, it } from 'vitest';
import { canAssign, canCancel, canFail, canMarkReady, getDeliveryStatusClasses, getDeliveryStatusLabel } from './deliveryStatus';

describe('delivery status mapping', () => {
  it.each([
    ['CREATED', 'Créée'],
    ['ASSIGNED', 'Assignée'],
    ['PICKED_UP', 'Récupérée'],
    ['IN_TRANSIT', 'En route'],
    ['DELIVERED', 'Livrée'],
    ['FAILED', 'Échec'],
    ['CANCELLED', 'Annulée'],
  ])('%s -> %s', (status, label) => {
    expect(getDeliveryStatusLabel(status)).toBe(label);
    expect(getDeliveryStatusClasses(status)).not.toContain('slate-100');
  });

  it('shows unknown values raw (contract 1)', () => {
    expect(getDeliveryStatusLabel('ON_HOLD')).toBe('ON_HOLD');
    expect(getDeliveryStatusClasses('ON_HOLD')).toContain('slate-100');
  });

  it('allows commands only in the contract states', () => {
    expect(['CREATED', 'ASSIGNED', 'PICKED_UP'].filter(canCancel)).toEqual(['CREATED', 'ASSIGNED']);
    expect(['CREATED', 'ASSIGNED', 'PICKED_UP'].filter(canMarkReady)).toEqual(['CREATED', 'ASSIGNED']);
    expect(['CREATED', 'ASSIGNED', 'PICKED_UP'].filter(canAssign)).toEqual(['CREATED', 'ASSIGNED']);
    expect(['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].filter(canFail)).toEqual(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT']);
  });
});
