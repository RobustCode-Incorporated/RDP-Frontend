import type { Delivery } from '../api/types';
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

