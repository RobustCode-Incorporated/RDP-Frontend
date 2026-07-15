import { api } from './axios';

export interface RestaurantOrderDto {
  id: number;
  restaurantId: number;
  customerId: number;
  driverId: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
  createdAt: string;
}

export interface RestaurantOrderHistoryDto {
  id: number;
  oldStatus: RestaurantOrderDto['status'] | null;
  newStatus: RestaurantOrderDto['status'];
  changedBy: string;
  createdAt: string;
}

export async function fetchRestaurantOrders() {
  const { data } = await api.get<RestaurantOrderDto[]>('/api/orders/restaurant');
  return data;
}

export async function fetchRestaurantOrderHistory(orderId: number) {
  const { data } = await api.get<RestaurantOrderHistoryDto[]>(`/api/orders/${orderId}/history`);
  return data;
}

export async function acceptRestaurantOrder(orderId: number) {
  const { data } = await api.patch<RestaurantOrderDto>(`/api/orders/${orderId}/accept`);
  return data;
}

export async function startPreparingRestaurantOrder(orderId: number) {
  const { data } = await api.patch<RestaurantOrderDto>(`/api/orders/${orderId}/prepare`);
  return data;
}

export async function readyRestaurantOrder(orderId: number) {
  const { data } = await api.patch<RestaurantOrderDto>(`/api/orders/${orderId}/ready`);
  return data;
}