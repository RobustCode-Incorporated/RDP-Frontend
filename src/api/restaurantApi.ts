import { api } from './axios';
import type { Restaurant } from './types';

// RESTAURANT role endpoints (contract sections 4 and 6).
export {
  cancelDelivery,
  createDelivery,
  fetchDeliveryHistory,
  markDeliveryReady,
  searchDeliveries,
} from './deliveryApi';

/** `GET /api/restaurants/me` - own restaurant (`400 "No restaurant assigned to user"`). */
export async function fetchMyRestaurant() {
  const { data } = await api.get<Restaurant>('/api/restaurants/me');
  return data;
}
