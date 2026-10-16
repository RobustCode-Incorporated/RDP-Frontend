// Shared API types, copied from the backend API contract v2 (section 10.3).
// Keep in sync with DeliveryPlatform/docs/api-contract-v2.md.

export type Role = 'ADMIN' | 'DISPATCHER' | 'RESTAURANT' | 'DRIVER' | 'CUSTOMER';
export type DeliveryStatus =
  | 'CREATED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT'
  | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type PaymentMode = 'PREPAID' | 'CASH_ON_DELIVERY';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
export type HistoryEvent =
  | 'CREATED' | 'ASSIGNED' | 'REASSIGNED' | 'READY' | 'PICKED_UP'
  | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELLED' | 'MIGRATED';

export interface ApiError {
  status: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

export interface LoginResponse { token: string; email: string; role: Role; }

export interface User {
  id: number; email: string; firstName: string; lastName: string;
  role: Role; enabled: boolean;
}

export interface DeliveryRestaurant {
  id: number; name: string; address: string;
  phone: string | null; latitude: number | null; longitude: number | null;
}

export interface DeliveryDriver {
  id: number;
  firstName: string | null; lastName: string | null;
  phone: string | null; vehicleType: string | null;
  latitude: number | null; longitude: number | null;
  lastLocationAt: string | null;
}

export interface Delivery {
  id: number;
  status: DeliveryStatus;
  version: number;
  restaurant: DeliveryRestaurant;
  driver: DeliveryDriver | null;
  customerName: string | null;
  customerPhone: string | null;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  description: string | null;
  notes: string | null;
  orderReference: string | null;
  orderAmount: number | null;
  paymentMode: PaymentMode;
  cashToCollect: number | null;
  deliveryFee: number | null;
  failureReason: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string | null;
  readyAt: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
}

export interface DeliveryHistory {
  id: number;
  event: HistoryEvent;
  oldStatus: DeliveryStatus | null;
  newStatus: DeliveryStatus;
  changedBy: string;
  note: string | null;
  createdAt: string;
}

export interface CreateDeliveryRequest {
  restaurantId?: number;            // required for ADMIN/DISPATCHER, ignored for RESTAURANT
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  pickupAddress?: string | null;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  description?: string | null;
  notes?: string | null;
  orderReference?: string | null;
  orderAmount?: number | null;
  paymentMode: PaymentMode;
  cashToCollect?: number | null;    // > 0 iff CASH_ON_DELIVERY
  deliveryFee?: number | null;
}

export interface Driver {
  id: number; userId: number;
  firstName: string; lastName: string; email: string;
  phoneNumber: string; vehicleType: string | null; vehiclePlate: string | null;
  availabilityStatus: AvailabilityStatus;
  currentLatitude: number | null; currentLongitude: number | null;
  lastLocationAt: string | null;
}

export interface Restaurant {
  id: number; name: string; description: string | null;
  phoneNumber: string | null; email: string | null;
  address: string; city: string | null; country: string | null;
  latitude: number | null; longitude: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

/** Query for `GET /api/deliveries` (section 4.1). Dates are `YYYY-MM-DD` (Brussels) or ISO date-times. */
export interface DeliverySearchParams {
  status?: DeliveryStatus[];
  from?: string;
  to?: string;
}

/** `POST /api/auth/register` with role DRIVER (section 2.2). */
export interface RegisterDriverRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  role: 'DRIVER';
}

/** `POST /api/auth/register-restaurant` (section 2.3, ADMIN). */
export interface RegisterRestaurantRequest {
  restaurantName: string;
  description?: string | null;
  phoneNumber: string;
  restaurantEmail: string;
  address: string;
  city?: string | null;
  country?: string | null;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

/** `PATCH /api/restaurants/{id}` (section 6.4). Omitted/null fields stay unchanged. */
export type UpdateRestaurantRequest = Partial<{
  name: string;
  description: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: Restaurant['status'];
}>;
