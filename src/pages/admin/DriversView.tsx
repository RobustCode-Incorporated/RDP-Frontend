import { useCallback, useState } from 'react';
import { disableUser, enableUser, fetchUsers } from '../../api/adminApi';
import { getApiErrorMessage } from '../../api/errors';
import type { Driver, User } from '../../api/types';
import { useToast } from '../../components/feedback/toastContext';
import { usePolling } from '../../hooks/usePolling';
import { getAvailabilityClasses, getAvailabilityLabel } from '../../lib/deliveryStatus';
import { formatElapsed, personName } from '../../lib/format';

interface DriversViewProps {
  drivers: Driver[];
  onDriversChanged: () => void;
}

export const PENDING_DRIVERS_POLL_MS = 60000;

export function DriversView({ drivers, onDriversChanged }: DriversViewProps) {
  const toast = useToast();
  const [pending, setPending] = useState<User[]>([]);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const loadPending = useCallback(async () => {
    try {
      setPending(await fetchUsers({ role: 'DRIVER', enabled: false }));
      setPendingError('');
    } catch (error) {
      setPendingError(getApiErrorMessage(error, 'Impossible de charger les comptes en attente.'));
    } finally {
      setPendingLoaded(true);
    }
  }, []);

  usePolling(loadPending, PENDING_DRIVERS_POLL_MS);

  const pendingIds = new Set(pending.map((user) => user.id));

  const handleEnable = async (user: User) => {
    setBusyUserId(user.id);
    try {
      await enableUser(user.id);
      setPending((list) => list.filter((item) => item.id !== user.id));
      toast.success(`${personName(user.firstName, user.lastName)} peut maintenant se connecter.`);
      onDriversChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Activation impossible.'));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDisable = async (driver: Driver) => {
    setBusyUserId(driver.userId);
    try {
      const user = await disableUser(driver.userId);
      setPending((list) => [...list.filter((item) => item.id !== user.id), user]);
      toast.success(`${personName(driver.firstName, driver.lastName)} a été désactivé.`);
      onDriversChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Désactivation impossible.'));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm" aria-labelledby="pending-drivers-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 id="pending-drivers-title" className="text-lg font-semibold">Chauffeurs en attente de validation</h3>
            <p className="text-sm text-slate-500">Inscrits via la page publique (ou désactivés). Ils ne peuvent pas se connecter avant validation.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{pending.length}</span>
        </div>
        {pendingError ? <p className="mb-3 text-sm text-rose-700">{pendingError}</p> : null}
        {pendingLoaded && !pendingError && pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Aucun compte chauffeur en attente.
          </p>
        ) : null}
        <ul className="divide-y divide-slate-100">
          {pending.map((user) => (
            <li key={user.id} aria-label={`Compte ${user.email}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{personName(user.firstName, user.lastName)}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                type="button"
                disabled={busyUserId === user.id}
                onClick={() => void handleEnable(user)}
                className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Valider le compte
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Tous les chauffeurs</h3>
            <p className="text-sm text-slate-500">Disponibilité gérée par le serveur (un chauffeur validé passe « Disponible » en ouvrant l’application).</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{drivers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-3 py-3 font-medium">Chauffeur</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Véhicule</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 font-medium">Position</th>
                <th className="px-3 py-3 font-medium"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => {
                const disabled = pendingIds.has(driver.userId);
                return (
                  <tr key={driver.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">{personName(driver.firstName, driver.lastName)}</td>
                    <td className="px-3 py-3 text-slate-600">{driver.phoneNumber}<span className="block text-xs text-slate-400">{driver.email}</span></td>
                    <td className="px-3 py-3 text-slate-600">{[driver.vehicleType, driver.vehiclePlate].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-3 py-3">
                      {disabled ? (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">Désactivé</span>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${getAvailabilityClasses(driver.availabilityStatus)}`}>
                          {getAvailabilityLabel(driver.availabilityStatus)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{driver.lastLocationAt ? formatElapsed(driver.lastLocationAt) : '—'}</td>
                    <td className="px-3 py-3">
                      {!disabled ? (
                        <button
                          type="button"
                          disabled={busyUserId === driver.userId}
                          onClick={() => void handleDisable(driver)}
                          className="rounded-full border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:border-rose-500 disabled:opacity-50"
                        >
                          Désactiver
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
