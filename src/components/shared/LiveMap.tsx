import { lazy, Suspense } from 'react';
import type { AdminLiveMapProps } from './AdminLiveMap';

// Leaflet (~150 kB) is only downloaded when a map is actually rendered.
const AdminLiveMapLazy = lazy(() => import('./AdminLiveMap').then((module) => ({ default: module.AdminLiveMap })));

export function LiveMap(props: AdminLiveMapProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Chargement de la carte…
        </div>
      }
    >
      <AdminLiveMapLazy {...props} />
    </Suspense>
  );
}
