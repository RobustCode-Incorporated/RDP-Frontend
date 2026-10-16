import type { Delivery, Driver, Restaurant, User } from '../api/types';

export const NOW_ISO = new Date().toISOString();

export function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 12,
    status: 'CREATED',
    version: 0,
    restaurant: {
      id: 3,
      name: 'Chez Mama Africa',
      address: 'Rue Neuve 1',
      phone: '+32 2 123 45 67',
      latitude: 50.8503,
      longitude: 4.3517,
    },
    driver: null,
    customerName: 'Claire Client',
    customerPhone: '+32 470 12 34 56',
    pickupAddress: 'Rue Neuve 1, Bruxelles',
    pickupLatitude: 50.8503,
    pickupLongitude: 4.3517,
    deliveryAddress: 'Avenue Louise 100, 1050 Ixelles',
    deliveryLatitude: 50.827,
    deliveryLongitude: 4.364,
    description: null,
    notes: 'Sonner 2x',
    orderReference: 'CMD-1001',
    orderAmount: 31.5,
    paymentMode: 'CASH_ON_DELIVERY',
    cashToCollect: 34,
    deliveryFee: 2.5,
    failureReason: null,
    cancellationReason: null,
    createdAt: NOW_ISO,
    updatedAt: null,
    readyAt: null,
    assignedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    failedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

export const ASSIGNED_DRIVER: Delivery['driver'] = {
  id: 4,
  firstName: 'Dan',
  lastName: 'Driver',
  phone: '+32470111222',
  vehicleType: 'BIKE',
  latitude: 50.84,
  longitude: 4.36,
  lastLocationAt: NOW_ISO,
};

export function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 4,
    userId: 12,
    firstName: 'Dan',
    lastName: 'Driver',
    email: 'drv@test.be',
    phoneNumber: '+32470111222',
    vehicleType: 'BIKE',
    vehiclePlate: '1-ABC-123',
    availabilityStatus: 'AVAILABLE',
    currentLatitude: 50.84,
    currentLongitude: 4.36,
    lastLocationAt: NOW_ISO,
    ...overrides,
  };
}

export function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 3,
    name: 'Chez Mama Africa',
    description: null,
    phoneNumber: '+32 2 123 45 67',
    email: 'mama@test.be',
    address: 'Rue Neuve 1',
    city: 'Bruxelles',
    country: 'BE',
    latitude: 50.8503,
    longitude: 4.3517,
    status: 'ACTIVE',
    ...overrides,
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 21,
    email: 'new.driver@test.be',
    firstName: 'Nina',
    lastName: 'Nouvelle',
    role: 'DRIVER',
    enabled: false,
    ...overrides,
  };
}
