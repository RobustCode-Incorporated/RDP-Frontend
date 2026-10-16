import { api } from './axios';
import type { Delivery, Driver } from './types';

// DRIVER endpoints (contract 4.2, 4.9, 5).

/** `GET /api/deliveries/me` - all deliveries ever assigned to me, newest first. Puts the driver online. */
export async function fetchMyDeliveries() {
  const { data } = await api.get<Delivery[]>('/api/deliveries/me');
  return data;
}

export async function fetchMyDriverProfile() {
  const { data } = await api.get<Driver>('/api/drivers/me');
  return data;
}

/** ASSIGNED -> PICKED_UP */
export async function pickupDelivery(deliveryId: number) {
  const { data } = await api.put<Delivery>(`/api/deliveries/${deliveryId}/pickup`);
  return data;
}

/** PICKED_UP -> IN_TRANSIT */
export async function startDelivery(deliveryId: number) {
  const { data } = await api.put<Delivery>(`/api/deliveries/${deliveryId}/start`);
  return data;
}

/** IN_TRANSIT -> DELIVERED */
export async function completeDelivery(deliveryId: number) {
  const { data } = await api.put<Delivery>(`/api/deliveries/${deliveryId}/complete`);
  return data;
}

/** ASSIGNED/PICKED_UP/IN_TRANSIT -> FAILED. `reason` required, max 180 chars. */
export async function failDelivery(deliveryId: number, reason: string) {
  const { data } = await api.put<Delivery>(`/api/deliveries/${deliveryId}/fail`, { reason });
  return data;
}
