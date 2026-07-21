import { api } from './axios';

export interface AdminRestaurantDto {
  id: number;
  name: string;
  description: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string;
  city: string | null;
  country: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  latitude?: number | null;
  longitude?: number | null;
}

export interface AdminDriverDto {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentLatitude?: number | null;
  currentLongitude?: number | null;
}

export interface AdminOrderDto {
  id: number;
  restaurantId: number;
  customerId: number;
  driverId: number | null;
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  totalAmount: string;
  createdAt: string;
}

export async function fetchAdminRestaurants() {
  const { data } = await api.get<AdminRestaurantDto[]>('/api/restaurants');
  return data;
}

export async function fetchAdminDrivers() {
  const { data } = await api.get<AdminDriverDto[]>('/api/drivers');
  return data;
}

export async function fetchAdminOrders() {
  const { data } = await api.get<AdminOrderDto[]>('/api/orders');
  return data;
}

export async function assignDriverToOrder(orderId: number, driverId: number) {
  const { data } = await api.patch<AdminOrderDto>(`/api/orders/${orderId}/assign-driver/${driverId}`);
  return data;
}
