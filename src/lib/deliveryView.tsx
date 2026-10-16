import type { Delivery, Driver, Restaurant } from '../api/types';
import { getAvailabilityLabel } from './deliveryStatus';
import type { MapPoint } from '../components/shared/AdminLiveMap';
import { formatTime, personName } from './format';
import { isPositionStale } from './geo';

export const telLink = (phone: string | null | undefined) =>
  phone ? (
    <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="underline decoration-slate-300 underline-offset-2 hover:text-black">
      {phone}
    </a>
  ) : (
    '—'
  );

export function buildDeliveryMapPoints(delivery: Delivery): MapPoint[] {
  const points: MapPoint[] = [];
  if (delivery.pickupLatitude !== null && delivery.pickupLongitude !== null) {
    points.push({
      id: `pickup-${delivery.id}`,
      kind: 'restaurant',
      label: delivery.restaurant.name,
      latitude: delivery.pickupLatitude,
      longitude: delivery.pickupLongitude,
    });
  }
  if (delivery.deliveryLatitude !== null && delivery.deliveryLongitude !== null) {
    points.push({
      id: `dest-${delivery.id}`,
      kind: 'destination',
      label: delivery.customerName ?? delivery.deliveryAddress,
      latitude: delivery.deliveryLatitude,
      longitude: delivery.deliveryLongitude,
    });
  }
  const driver = delivery.driver;
  if (driver && driver.latitude !== null && driver.longitude !== null) {
    points.push({
      id: `driver-${driver.id}`,
      kind: 'driver',
      label: personName(driver.firstName, driver.lastName, `Chauffeur #${driver.id}`),
      latitude: driver.latitude,
      longitude: driver.longitude,
      statusLabel: driver.lastLocationAt ? `vu à ${formatTime(driver.lastLocationAt)}` : undefined,
      stale: isPositionStale(driver.lastLocationAt),
    });
  }
  return points;
}

export function buildLiveMapPoints(deliveries: Delivery[], drivers: Driver[], restaurants: Restaurant[]) {
  const points: MapPoint[] = [];
  const restaurantPins = new Map<number, MapPoint>();
  restaurants.forEach((restaurant) => {
    if (restaurant.latitude !== null && restaurant.longitude !== null) {
      restaurantPins.set(restaurant.id, {
        id: `r-${restaurant.id}`,
        kind: 'restaurant',
        label: restaurant.name,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        statusLabel: restaurant.status === 'ACTIVE' ? 'Actif' : 'Inactif',
      });
    }
  });
  // Dispatchers cannot list restaurants: fall back to the summaries embedded in deliveries.
  deliveries.forEach((delivery) => {
    const { restaurant } = delivery;
    if (!restaurantPins.has(restaurant.id) && restaurant.latitude !== null && restaurant.longitude !== null) {
      restaurantPins.set(restaurant.id, {
        id: `r-${restaurant.id}`,
        kind: 'restaurant',
        label: restaurant.name,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      });
    }
    if (delivery.deliveryLatitude !== null && delivery.deliveryLongitude !== null) {
      points.push({
        id: `d-${delivery.id}`,
        kind: 'destination',
        label: `#${delivery.id} ${delivery.customerName ?? ''}`.trim(),
        latitude: delivery.deliveryLatitude,
        longitude: delivery.deliveryLongitude,
      });
    }
  });
  drivers.forEach((driver) => {
    if (driver.currentLatitude !== null && driver.currentLongitude !== null) {
      points.push({
        id: `drv-${driver.id}`,
        kind: 'driver',
        label: personName(driver.firstName, driver.lastName, `Chauffeur #${driver.id}`),
        latitude: driver.currentLatitude,
        longitude: driver.currentLongitude,
        statusLabel: getAvailabilityLabel(driver.availabilityStatus),
        stale: isPositionStale(driver.lastLocationAt),
      });
    }
  });
  return [...restaurantPins.values(), ...points];
}
