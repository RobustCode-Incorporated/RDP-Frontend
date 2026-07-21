import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type MapPoint = {
  id: number;
  label: string;
  latitude: number;
  longitude: number;
  kind: 'restaurant' | 'driver';
  statusLabel?: string;
};

interface AdminLiveMapProps {
  points: MapPoint[];
  missingRestaurantsCount: number;
  missingDriversCount: number;
}

const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];

export function AdminLiveMap({ points, missingRestaurantsCount, missingDriversCount }: AdminLiveMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const markers = points.map((point) => {
      const color = point.kind === 'driver' ? '#2563eb' : '#10b981';

      return L.circleMarker([point.latitude, point.longitude], {
        radius: point.kind === 'driver' ? 7 : 6,
        color,
        fillColor: color,
        fillOpacity: 0.72,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(
          `<div style="font-size: 12px; line-height: 1.35;">
            <div style="font-weight: 700; margin-bottom: 2px;">${point.label}</div>
            <div style="color: #64748b; margin-bottom: 4px;">${point.kind === 'driver' ? 'Chauffeur' : 'Restaurant'}${point.statusLabel ? ` · ${point.statusLabel}` : ''}</div>
            <div style="color: #94a3b8;">${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</div>
          </div>`
        );
    });

    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]));
    map.fitBounds(bounds.pad(0.15));

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Coordonnees indisponibles pour afficher la carte live.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        <div ref={mapRef} className="h-[340px] w-full" />
      </div>

      <div className="text-xs text-slate-500 rounded-2xl bg-slate-50 px-4 py-3">
        Restaurants sans coordonnees: {missingRestaurantsCount} · Chauffeurs sans coordonnees: {missingDriversCount}
      </div>
    </div>
  );
}
