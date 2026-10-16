import { useEffect, useMemo, useState } from 'react';
import { assignDriver, fetchAvailableDrivers } from '../../api/adminApi';
import { getApiErrorMessage, parseApiError } from '../../api/errors';
import type { Delivery, Driver } from '../../api/types';
import { useToast } from '../../components/feedback/toastContext';
import { distanceKm, formatDistance, isPositionStale, toLatLng } from '../../lib/geo';
import { formatElapsed, personName } from '../../lib/format';

interface AssignDriverPanelProps {
  delivery: Delivery;
  onAssigned: (updated: Delivery) => void;
}

type DriversState = { requestId: number; drivers: Driver[]; error: string };

/** Picks a driver from GET /api/drivers/available and calls PUT /assign (contract 4.6). */
export function AssignDriverPanel({ delivery, onAssigned }: AssignDriverPanelProps) {
  const toast = useToast();
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<DriversState>({ requestId: -1, drivers: [], error: '' });
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchAvailableDrivers()
      .then((drivers) => {
        if (active) setState({ requestId, drivers, error: '' });
      })
      .catch((error: unknown) => {
        if (active) setState({ requestId, drivers: [], error: getApiErrorMessage(error, 'Chauffeurs indisponibles.') });
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  const isLoading = state.requestId !== requestId;
  const pickup = toLatLng(delivery.pickupLatitude, delivery.pickupLongitude)
    ?? toLatLng(delivery.restaurant.latitude, delivery.restaurant.longitude);

  const candidates = useMemo(() => {
    return state.drivers
      .filter((driver) => driver.id !== delivery.driver?.id)
      .map((driver) => {
        const position = toLatLng(driver.currentLatitude, driver.currentLongitude);
        return { driver, distance: pickup && position ? distanceKm(pickup, position) : null };
      })
      .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));
  }, [state.drivers, delivery.driver?.id, pickup]);

  const handleAssign = async (driver: Driver) => {
    setAssigningId(driver.id);
    try {
      const updated = await assignDriver(delivery.id, driver.id);
      toast.success(`${personName(driver.firstName, driver.lastName)} assigné à la livraison #${delivery.id}.`);
      onAssigned(updated);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Affectation impossible.'));
      // Contract 4.6: refresh the available list after a 409.
      if (parseApiError(error).status === 409) setRequestId((value) => value + 1);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          {delivery.driver ? 'Réassigner à un autre chauffeur' : 'Assigner un chauffeur disponible'}
        </p>
        <button
          type="button"
          onClick={() => setRequestId((value) => value + 1)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-black"
        >
          Actualiser
        </button>
      </div>
      {isLoading ? <p className="text-sm text-slate-500">Chargement des chauffeurs disponibles…</p> : null}
      {!isLoading && state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {!isLoading && !state.error && candidates.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Aucun chauffeur disponible pour le moment. Un chauffeur apparaît ici quand il ouvre l’application.
        </p>
      ) : null}
      {!isLoading && candidates.length > 0 ? (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {candidates.map(({ driver, distance }) => {
            const name = personName(driver.firstName, driver.lastName, `Chauffeur #${driver.id}`);
            return (
              <li key={driver.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">
                    {[driver.vehicleType, driver.phoneNumber].filter(Boolean).join(' · ')}
                    {distance !== null ? ` · à ${formatDistance(distance)} du restaurant` : ' · position inconnue'}
                    {driver.lastLocationAt && isPositionStale(driver.lastLocationAt) ? ` (vu ${formatElapsed(driver.lastLocationAt)})` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Assigner ${name}`}
                  disabled={assigningId !== null}
                  onClick={() => void handleAssign(driver)}
                  className="shrink-0 rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {assigningId === driver.id ? 'Affectation…' : 'Assigner'}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
