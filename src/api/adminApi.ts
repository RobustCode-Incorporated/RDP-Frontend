import { api } from './axios';
import type {
  Delivery,
  Driver,
  RegisterRestaurantRequest,
  Restaurant,
  Role,
  UpdateRestaurantRequest,
  User,
} from './types';

// ADMIN / DISPATCHER endpoints (contract sections 2.3, 4.6, 5, 6, 7).
export {
  cancelDelivery,
  fetchDeliveryHistory,
  markDeliveryReady,
  searchDeliveries,
} from './deliveryApi';

/** `GET /api/restaurants` (ADMIN). */
export async function fetchRestaurants() {
  const { data } = await api.get<Restaurant[]>('/api/restaurants');
  return data;
}

/** `PATCH /api/restaurants/{id}` (ADMIN) - partial update (e.g. coordinates). */
export async function updateRestaurant(restaurantId: number, patch: UpdateRestaurantRequest) {
  const { data } = await api.patch<Restaurant>(`/api/restaurants/${restaurantId}`, patch);
  return data;
}

/** `POST /api/auth/register-restaurant` (ADMIN) - restaurant + its RESTAURANT login. Returns the new User. */
export async function registerRestaurant(request: RegisterRestaurantRequest) {
  const { data } = await api.post<User>('/api/auth/register-restaurant', request);
  return data;
}

/** `GET /api/drivers` (ADMIN, DISPATCHER). */
export async function fetchDrivers() {
  const { data } = await api.get<Driver[]>('/api/drivers');
  return data;
}

/** `GET /api/drivers/available` (ADMIN, DISPATCHER) - enabled + AVAILABLE. */
export async function fetchAvailableDrivers() {
  const { data } = await api.get<Driver[]>('/api/drivers/available');
  return data;
}

/** `PUT /api/deliveries/{id}/assign` (ADMIN, DISPATCHER) - assign or reassign before pickup. */
export async function assignDriver(deliveryId: number, driverId: number) {
  const { data } = await api.put<Delivery>(`/api/deliveries/${deliveryId}/assign`, { driverId });
  return data;
}

/** `GET /api/admin/users?role=&enabled=` (ADMIN). */
export async function fetchUsers(filters: { role?: Role; enabled?: boolean } = {}) {
  const query = new URLSearchParams();
  if (filters.role) query.set('role', filters.role);
  if (filters.enabled !== undefined) query.set('enabled', String(filters.enabled));
  const suffix = query.toString();
  const { data } = await api.get<User[]>(`/api/admin/users${suffix ? `?${suffix}` : ''}`);
  return data;
}

export async function enableUser(userId: number) {
  const { data } = await api.patch<User>(`/api/admin/users/${userId}/enable`);
  return data;
}

export async function disableUser(userId: number) {
  const { data } = await api.patch<User>(`/api/admin/users/${userId}/disable`);
  return data;
}
