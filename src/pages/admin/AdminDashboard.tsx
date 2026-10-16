import { useCallback, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DeliveryDetailDrawer } from '../../components/shared/DeliveryDetailDrawer';
import { CancelDeliveryDialog } from '../../components/shared/CancelDeliveryDialog';
import { useToast } from '../../components/feedback/toastContext';
import { usePolling } from '../../hooks/usePolling';
import { useAuthStore } from '../../store/useAuthStore';
import { cancelDelivery, fetchDrivers, fetchRestaurants, markDeliveryReady, searchDeliveries } from '../../api/adminApi';
import { getApiErrorMessage, parseApiError } from '../../api/errors';
import type { Delivery, Driver, Restaurant } from '../../api/types';
import { ACTIVE_DELIVERY_STATUSES, canAssign, canCancel, canMarkReady, isActiveStatus } from '../../lib/deliveryStatus';
import { formatTime } from '../../lib/format';
import { AssignDriverPanel } from './AssignDriverPanel';
import { DeliveriesTable } from './DeliveriesTable';
import { DispatchView } from './DispatchView';
import { DriversView } from './DriversView';
import { RestaurantsView } from './RestaurantsView';

/** Contract 9.1: dispatcher board every 10-15 s, drivers (live map) every 15-30 s. */
export const ADMIN_DELIVERIES_POLL_MS = 15000;
export const ADMIN_DRIVERS_POLL_MS = 30000;

type AdminTab = 'dispatch' | 'deliveries' | 'drivers' | 'restaurants';

const ALL_TABS: Array<{ id: AdminTab; label: string; adminOnly?: boolean }> = [
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'deliveries', label: 'Livraisons' },
  { id: 'drivers', label: 'Chauffeurs' },
  { id: 'restaurants', label: 'Restaurants', adminOnly: true },
];

export const AdminDashboard = () => {
  const toast = useToast();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN';
  const tabs = ALL_TABS.filter((tab) => isAdmin || !tab.adminOnly).filter((tab) => isAdmin || tab.id !== 'drivers');
  const [currentTab, setCurrentTab] = useState<AdminTab>('dispatch');
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [restaurantsKey, setRestaurantsKey] = useState(0);

  const loadDeliveries = useCallback(async () => {
    try {
      setActiveDeliveries(await searchDeliveries({ status: ACTIVE_DELIVERY_STATUSES }));
      setLoadError('');
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Impossible de charger les livraisons.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    try {
      setDrivers(await fetchDrivers());
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Impossible de charger les chauffeurs.'));
    }
  }, []);

  const loadRestaurants = useCallback(async () => {
    try {
      setRestaurants(await fetchRestaurants());
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Impossible de charger les restaurants.'));
    }
  }, []);

  usePolling(loadDeliveries, ADMIN_DELIVERIES_POLL_MS);
  usePolling(loadDrivers, ADMIN_DRIVERS_POLL_MS);
  // GET /api/restaurants is ADMIN only; reloaded after edits.
  usePolling(loadRestaurants, 5 * 60 * 1000, restaurantsKey, isAdmin);

  /** Contract 9.1: replace the cached delivery with the server response. */
  const applyUpdate = (updated: Delivery) => {
    setActiveDeliveries((list) => {
      const others = list.filter((item) => item.id !== updated.id);
      return isActiveStatus(updated.status) ? [updated, ...others] : others;
    });
    setSelected(updated);
    setTableRefreshKey((value) => value + 1);
  };

  // Keep the drawer in sync with polling results.
  const selectedDelivery = useMemo(() => {
    if (!selected) return null;
    const fresh = activeDeliveries.find((item) => item.id === selected.id);
    return fresh && fresh.version >= selected.version ? fresh : selected;
  }, [selected, activeDeliveries]);

  const openDelivery = (delivery: Delivery) => {
    setSelected(delivery);
    setShowCancel(false);
  };

  const handleAssigned = (updated: Delivery) => {
    applyUpdate(updated);
    void loadDrivers();
  };

  const runCommand = async (command: () => Promise<Delivery>, success: string, fallback: string) => {
    setIsBusy(true);
    try {
      applyUpdate(await command());
      toast.success(success);
      setShowCancel(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, fallback));
      if (parseApiError(error).status === 409) void loadDeliveries();
    } finally {
      setIsBusy(false);
    }
  };

  const created = activeDeliveries.filter((item) => item.status === 'CREATED');
  const statCards = [
    { label: 'À assigner', value: created.length, helper: `${created.filter((item) => item.readyAt).length} prêtes au retrait` },
    { label: 'En cours', value: activeDeliveries.length - created.length, helper: 'Assignées, récupérées ou en route' },
    {
      label: 'Chauffeurs disponibles',
      value: drivers.filter((driver) => driver.availabilityStatus === 'AVAILABLE').length,
      helper: `${drivers.filter((driver) => driver.availabilityStatus === 'BUSY').length} en livraison · ${drivers.length} au total`,
    },
  ];

  return (
    <AppShell
      title={isAdmin ? 'Administration' : 'Dispatch'}
      subtitle="Assignation des chauffeurs et suivi des livraisons en direct"
      navigationItems={tabs}
      activeItem={currentTab}
      onChangeItem={(itemId) => setCurrentTab(itemId as AdminTab)}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vue {isAdmin ? 'admin' : 'dispatch'}</p>
            <h2 className="text-2xl font-semibold text-slate-900">{tabs.find((tab) => tab.id === currentTab)?.label}</h2>
          </div>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Chargement des données admin...' : lastSyncAt ? `Actualisé à ${formatTime(lastSyncAt)} (toutes les 15 s)` : ''}
          </p>
        </div>

        {loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => {
                  void loadDeliveries();
                  void loadDrivers();
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="text-sm text-slate-500">{card.label}</h3>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
            </div>
          ))}
        </div>

        {currentTab === 'dispatch' ? (
          <DispatchView
            deliveries={activeDeliveries}
            drivers={drivers}
            restaurants={restaurants}
            isLoading={isLoading}
            onOpen={openDelivery}
          />
        ) : null}
        {currentTab === 'deliveries' ? (
          <DeliveriesTable restaurants={restaurants} refreshKey={tableRefreshKey} onOpen={openDelivery} />
        ) : null}
        {currentTab === 'drivers' && isAdmin ? <DriversView drivers={drivers} onDriversChanged={() => void loadDrivers()} /> : null}
        {currentTab === 'restaurants' && isAdmin ? (
          <RestaurantsView restaurants={restaurants} onChanged={() => setRestaurantsKey((value) => value + 1)} />
        ) : null}
      </div>

      <DeliveryDetailDrawer
        delivery={selectedDelivery}
        onClose={() => setSelected(null)}
        footer={
          selectedDelivery ? (
            <div className="space-y-4">
              {canAssign(selectedDelivery.status) ? (
                <AssignDriverPanel key={`${selectedDelivery.id}:${selectedDelivery.version}`} delivery={selectedDelivery} onAssigned={handleAssigned} />
              ) : null}
              {isAdmin && showCancel && canCancel(selectedDelivery.status) ? (
                <CancelDeliveryDialog
                  deliveryId={selectedDelivery.id}
                  isSubmitting={isBusy}
                  onDismiss={() => setShowCancel(false)}
                  onConfirm={(reason) =>
                    void runCommand(() => cancelDelivery(selectedDelivery.id, reason), `Livraison #${selectedDelivery.id} annulée.`, 'Annulation impossible.')}
                />
              ) : null}
              {isAdmin && !showCancel ? (
                <div className="flex flex-wrap gap-2">
                  {canMarkReady(selectedDelivery.status) && !selectedDelivery.readyAt ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runCommand(() => markDeliveryReady(selectedDelivery.id), 'Commande marquée prête.', 'Action impossible.')}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-black disabled:opacity-50"
                    >
                      Commande prête
                    </button>
                  ) : null}
                  {canCancel(selectedDelivery.status) ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowCancel(true)}
                      className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:border-rose-500 disabled:opacity-50"
                    >
                      Annuler la livraison
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
    </AppShell>
  );
};
