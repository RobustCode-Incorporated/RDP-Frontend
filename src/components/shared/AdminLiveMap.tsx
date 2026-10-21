import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPointKind = 'restaurant' | 'driver' | 'destination';

export type MapPoint = {
  id: string | number;
  label: string;
  latitude: number;
  longitude: number;
  kind: MapPointKind;
  statusLabel?: string;
  /** Driver position older than ~5 min (contract 5): drawn grey. */
  stale?: boolean;
};

export interface AdminLiveMapProps {
  points: MapPoint[];
  missingRestaurantsCount?: number;
  missingDriversCount?: number;
  /** Tailwind height class of the map container. */
  heightClassName?: string;
  emptyMessage?: string;
}

// Brussels: pilot city.
const DEFAULT_CENTER: [number, number] = [50.8503, 4.3517];

const KIND_STYLE: Record<MapPointKind, { color: string; radius: number; label: string }> = {
  restaurant: { color: '#10b981', radius: 7, label: 'Restaurant' },
  driver: { color: '#2563eb', radius: 7, label: 'Chauffeur' },
  destination: { color: '#f97316', radius: 6, label: 'Client' },
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

export function AdminLiveMap({
  points,
  missingRestaurantsCount,
  missingDriversCount,
  heightClassName = 'h-[340px]',
  emptyMessage = 'Coordonnées indisponibles pour afficher la carte live.',
}: AdminLiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedRef = useRef(false);
  const hasPoints = points.length > 0;

  // Create the map once; markers are refreshed in a layer group so polling does not reset the view.
  useEffect(() => {
    if (!containerRef.current || !hasPoints) {
      return;
    }
    const map = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: 12, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    hasFittedRef.current = false;

    return () => {
      // Stop pending pan/zoom animations: removing a map mid-animation throws (_leaflet_pos).
      map.stop();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [hasPoints]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) {
      return;
    }
    layer.clearLayers();
    points.forEach((point) => {
      const style = KIND_STYLE[point.kind];
      const color = point.stale ? '#94a3b8' : style.color;
      L.circleMarker([point.latitude, point.longitude], {
        radius: style.radius,
        color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 2,
      })
        .bindPopup(
          `<div style="font-size: 12px; line-height: 1.35;">
            <div style="font-weight: 700; margin-bottom: 2px;">${escapeHtml(point.label)}</div>
            <div style="color: #64748b;">${style.label}${point.statusLabel ? ` · ${escapeHtml(point.statusLabel)}` : ''}${point.stale ? ' · position ancienne' : ''}</div>
          </div>`
        )
        .addTo(layer);
    });

    if (!hasFittedRef.current && points.length > 0) {
      const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]));
      if (points.length === 1) {
        map.setView(bounds.getCenter(), 14, { animate: false });
      } else {
        map.fitBounds(bounds.pad(0.2), { animate: false });
      }
      hasFittedRef.current = true;
    }
  }, [points, hasPoints]);

  if (!hasPoints) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const showMissing = missingRestaurantsCount !== undefined || missingDriversCount !== undefined;

  return (
    <div className="space-y-3">
      <div className="relative isolate overflow-hidden rounded-2xl border border-slate-100">
        <div ref={containerRef} className={`${heightClassName} w-full`} data-testid="leaflet-map" />
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />Restaurant</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />Chauffeur</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Client</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-400" />Position &gt; 5 min</span>
      </div>
      {showMissing ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Restaurants sans coordonnées : {missingRestaurantsCount ?? 0} · Chauffeurs sans position : {missingDriversCount ?? 0}
        </div>
      ) : null}
    </div>
  );
}
