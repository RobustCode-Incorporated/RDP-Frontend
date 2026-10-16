export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatDistance = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toLocaleString('fr-BE', { maximumFractionDigits: 1 })} km`;

/** Builds a LatLng only when both coordinates are present. */
export const toLatLng = (latitude: number | null | undefined, longitude: number | null | undefined): LatLng | null =>
  typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : null;

/** Contract 5: a driver position older than ~5 minutes is stale. */
export const STALE_POSITION_MS = 5 * 60 * 1000;

export const isPositionStale = (lastLocationAt: string | null | undefined, now: number = Date.now()) =>
  !lastLocationAt || now - Date.parse(lastLocationAt) > STALE_POSITION_MS;
