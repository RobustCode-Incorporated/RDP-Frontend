import { useCallback, useMemo, useState } from 'react';
import { searchDeliveries } from '../../api/adminApi';
import { getApiErrorMessage } from '../../api/errors';
import type { Delivery, DeliveryStatus, Restaurant } from '../../api/types';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { usePolling } from '../../hooks/usePolling';
import { ALL_DELIVERY_STATUSES, DELIVERY_STATUS_LABELS } from '../../lib/deliveryStatus';
import { formatDateTime, formatMoney, personName, todayInBrussels } from '../../lib/format';

interface DeliveriesTableProps {
  restaurants: Restaurant[];
  /** Bumped by the parent after a command so the table reloads. */
  refreshKey: number;
  onOpen: (delivery: Delivery) => void;
}

export const DELIVERIES_TABLE_POLL_MS = 30000;

const selectClass = 'rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black';

export function DeliveriesTable({ restaurants, refreshKey, onOpen }: DeliveriesTableProps) {
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [restaurantId, setRestaurantId] = useState('');
  const [date, setDate] = useState(() => todayInBrussels());
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const queryKey = `${status}|${date}|${refreshKey}`;

  const load = useCallback(async () => {
    try {
      const result = await searchDeliveries({
        status: status ? [status] : undefined,
        from: date || undefined,
        to: date || undefined,
      });
      setDeliveries(result);
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de charger les livraisons.'));
    } finally {
      setLoadedKey(queryKey);
    }
  }, [status, date, queryKey]);

  usePolling(load, DELIVERIES_TABLE_POLL_MS, queryKey);

  // The API has no restaurant filter: filter client side. Options come from the admin
  // restaurant list, or from the deliveries themselves (dispatchers).
  const restaurantOptions = useMemo(() => {
    const options = new Map<number, string>();
    restaurants.forEach((restaurant) => options.set(restaurant.id, restaurant.name));
    deliveries.forEach((delivery) => options.set(delivery.restaurant.id, delivery.restaurant.name));
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [restaurants, deliveries]);

  const rows = restaurantId ? deliveries.filter((delivery) => String(delivery.restaurant.id) === restaurantId) : deliveries;
  const isLoading = loadedKey !== queryKey;

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4 md:items-end">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Statut
          <select value={status} onChange={(event) => setStatus(event.target.value as DeliveryStatus | '')} className={selectClass}>
            <option value="">Tous</option>
            {ALL_DELIVERY_STATUSES.map((value) => (
              <option key={value} value={value}>{DELIVERY_STATUS_LABELS[value]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Restaurant
          <select value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)} className={selectClass}>
            <option value="">Tous</option>
            {restaurantOptions.map(([id, name]) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
          Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={selectClass} />
        </label>
        <p className="text-sm text-slate-500 md:text-right">
          {isLoading ? 'Chargement…' : `${rows.length} livraison${rows.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Restaurant</th>
              <th className="px-3 py-3 font-medium">Client</th>
              <th className="px-3 py-3 font-medium">Chauffeur</th>
              <th className="px-3 py-3 font-medium">Paiement</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Créée le</th>
              <th className="px-3 py-3 font-medium"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 font-medium text-slate-900">
                  #{delivery.id}
                  {delivery.orderReference ? <span className="block text-xs font-normal text-slate-400">{delivery.orderReference}</span> : null}
                </td>
                <td className="px-3 py-3 text-slate-600">{delivery.restaurant.name}</td>
                <td className="px-3 py-3 text-slate-600">{delivery.customerName ?? '—'}</td>
                <td className="px-3 py-3 text-slate-600">
                  {delivery.driver ? personName(delivery.driver.firstName, delivery.driver.lastName, `#${delivery.driver.id}`) : '—'}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {delivery.paymentMode === 'CASH_ON_DELIVERY' ? `Cash ${formatMoney(delivery.cashToCollect)}` : 'Prépayée'}
                </td>
                <td className="px-3 py-3"><StatusBadge status={delivery.status} /></td>
                <td className="px-3 py-3 text-slate-600">{formatDateTime(delivery.createdAt)}</td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onOpen(delivery)}
                    aria-label={`Voir la livraison #${delivery.id}`}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-black hover:text-black"
                  >
                    Voir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Aucune livraison ne correspond aux filtres.
        </p>
      ) : null}
    </section>
  );
}
