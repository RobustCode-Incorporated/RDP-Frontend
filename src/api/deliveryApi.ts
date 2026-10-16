import { api } from './axios';
import type { CreateDeliveryRequest, Delivery, DeliveryHistory, DeliverySearchParams } from './types';

// Delivery endpoints shared by several roles (contract section 4).
// Visibility is enforced server side: ADMIN/DISPATCHER see all, RESTAURANT its own, DRIVER its assigned.

/** Serializes repeatable `status` params as `?status=A&status=B` (not `status[]=`). */
export const buildDeliverySearchQuery = ({ status, from, to }: DeliverySearchParams = {}) => {
  const query = new URLSearchParams();
  status?.forEach((value) => query.append('status', value));
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return query.toString();
};

/** `GET /api/deliveries` - newest first. */
export async function searchDeliveries(params: DeliverySearchParams = {}) {
  const query = buildDeliverySearchQuery(params);
  const { data } = await api.get<Delivery[]>(`/api/deliveries${query ? `?${query}` : ''}`);
  return data;
}

export async function fetchDelivery(deliveryId: number) {
  const { data } = await api.get<Delivery>(`/api/deliveries/${deliveryId}`);
  return data;
}

/** `GET /api/deliveries/{id}/history` - oldest first. */
export async function fetchDeliveryHistory(deliveryId: number) {
  const { data } = await api.get<DeliveryHistory[]>(`/api/deliveries/${deliveryId}/history`);
  return data;
}

/** `POST /api/deliveries` (ADMIN, DISPATCHER, RESTAURANT). */
export async function createDelivery(request: CreateDeliveryRequest) {
  const { data } = await api.post<Delivery>('/api/deliveries', request);
  return data;
}

/** `PATCH /api/deliveries/{id}/ready` (ADMIN, owning RESTAURANT). Sets `readyAt`, status unchanged. */
export async function markDeliveryReady(deliveryId: number) {
  const { data } = await api.patch<Delivery>(`/api/deliveries/${deliveryId}/ready`);
  return data;
}

/** `PATCH /api/deliveries/{id}/cancel` (ADMIN, owning RESTAURANT). Only CREATED/ASSIGNED. */
export async function cancelDelivery(deliveryId: number, reason?: string | null) {
  const trimmed = reason?.trim();
  const { data } = await api.patch<Delivery>(
    `/api/deliveries/${deliveryId}/cancel`,
    trimmed ? { reason: trimmed } : {}
  );
  return data;
}
