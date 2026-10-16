import { useMemo } from 'react';
import type { Delivery, Driver, Restaurant } from '../../api/types';
import { LiveMap } from '../../components/shared/LiveMap';
import { ReadyBadge, StatusBadge } from '../../components/shared/StatusBadge';
import { buildLiveMapPoints } from '../../lib/deliveryView';
import { formatElapsed, formatMoney, personName } from '../../lib/format';

interface DispatchViewProps {
  deliveries: Delivery[];
  drivers: Driver[];
  restaurants: Restaurant[];
  isLoading: boolean;
  onOpen: (delivery: Delivery) => void;
}

export function DispatchView({ deliveries, drivers, restaurants, isLoading, onOpen }: DispatchViewProps) {
  const queue = useMemo(
    () => deliveries
      .filter((delivery) => delivery.status === 'CREATED')
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id),
    [deliveries]
  );
  const inProgress = useMemo(
    () => deliveries.filter((delivery) => delivery.status !== 'CREATED'),
    [deliveries]
  );
  const points = useMemo(() => buildLiveMapPoints(deliveries, drivers, restaurants), [deliveries, drivers, restaurants]);
  const missingRestaurants = restaurants.filter((restaurant) => restaurant.latitude === null).length;
  const missingDrivers = drivers.filter((driver) => driver.currentLatitude === null).length;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">À assigner</h3>
            <p className="text-sm text-slate-500">Plus anciennes en premier. Les commandes prêtes sont mises en avant.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{queue.length}</span>
        </div>
        {!isLoading && queue.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Aucune livraison en attente de chauffeur.
          </p>
        ) : null}
        <ul className="space-y-3">
          {queue.map((delivery) => (
            <li
              key={delivery.id}
              aria-label={`Livraison #${delivery.id}`}
              className={`rounded-2xl border p-4 ${delivery.readyAt ? 'border-fuchsia-300 bg-fuchsia-50/60 ring-1 ring-fuchsia-200' : 'border-slate-100 bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    Livraison #{delivery.id} · {delivery.restaurant.name}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-600">{delivery.customerName ?? 'Client'} · {delivery.deliveryAddress}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Créée {formatElapsed(delivery.createdAt)}
                    {delivery.paymentMode === 'CASH_ON_DELIVERY' ? ` · Cash ${formatMoney(delivery.cashToCollect)}` : ' · Prépayée'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {delivery.readyAt ? <ReadyBadge /> : <StatusBadge status={delivery.status} />}
                  <button
                    type="button"
                    onClick={() => onOpen(delivery)}
                    className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    Assigner
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">En cours</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{inProgress.length}</span>
        </div>
        {!isLoading && inProgress.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune livraison en cours.</p>
        ) : null}
        <ul className="divide-y divide-slate-100">
          {inProgress.map((delivery) => (
            <li key={delivery.id} aria-label={`Livraison en cours #${delivery.id}`} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">#{delivery.id} · {delivery.restaurant.name} → {delivery.customerName ?? 'Client'}</p>
                <p className="text-xs text-slate-500">
                  {delivery.driver ? personName(delivery.driver.firstName, delivery.driver.lastName, `#${delivery.driver.id}`) : '—'}
                  {delivery.readyAt && delivery.status === 'ASSIGNED' ? ' · commande prête' : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={delivery.status} />
                <button
                  type="button"
                  onClick={() => onOpen(delivery)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-black"
                >
                  {delivery.status === 'ASSIGNED' ? 'Réassigner' : 'Voir'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Carte live</h3>
            <p className="text-sm text-slate-500">Restaurants, chauffeurs et clients des livraisons actives.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{points.length} points</span>
        </div>
        <LiveMap
          points={points}
          heightClassName="h-[420px]"
          missingRestaurantsCount={missingRestaurants}
          missingDriversCount={missingDrivers}
        />
      </section>
    </div>
  );
}
