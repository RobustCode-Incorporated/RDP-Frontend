import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DeliveryDetailDrawer } from '../../components/shared/DeliveryDetailDrawer';
import { CancelDeliveryDialog } from '../../components/shared/CancelDeliveryDialog';
import { ReadyBadge, StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../components/feedback/toastContext';
import { usePolling } from '../../hooks/usePolling';
import { cancelDelivery, fetchMyRestaurant, markDeliveryReady, searchDeliveries } from '../../api/restaurantApi';
import { getApiErrorMessage, parseApiError } from '../../api/errors';
import type { Delivery, Restaurant } from '../../api/types';
import {
  ACTIVE_DELIVERY_STATUSES,
  TERMINAL_DELIVERY_STATUSES,
  canCancel,
  canMarkReady,
  getPaymentModeLabel,
  isActiveStatus,
} from '../../lib/deliveryStatus';
import { formatElapsed, formatMoney, formatTime, personName, todayInBrussels } from '../../lib/format';
import { CreateDeliveryForm } from './CreateDeliveryForm';

/** Contract 9.1: restaurant dashboard polls every 15-30 s. */
export const RESTAURANT_POLL_MS = 15000;

type Tab = 'active' | 'done';

export const RestaurantDashboard = () => {
  const toast = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantError, setRestaurantError] = useState('');
  const [tab, setTab] = useState<Tab>('active');
  const [doneDate, setDoneDate] = useState(() => todayInBrussels());
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [doneDeliveries, setDoneDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Delivery | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMyRestaurant()
      .then((value) => {
        if (active) setRestaurant(value);
      })
      .catch((error: unknown) => {
        if (active) setRestaurantError(getApiErrorMessage(error, 'Restaurant introuvable.'));
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDeliveries = useCallback(async () => {
    try {
      const [active, done] = await Promise.all([
        searchDeliveries({ status: ACTIVE_DELIVERY_STATUSES }),
        tab === 'done'
          ? searchDeliveries({ status: TERMINAL_DELIVERY_STATUSES, from: doneDate, to: doneDate })
          : Promise.resolve(null),
      ]);
      setActiveDeliveries(active);
      if (done) setDoneDeliveries(done);
      setLoadError('');
      setLastSyncAt(new Date().toISOString());
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Impossible de charger les livraisons.'));
    } finally {
      setIsLoading(false);
    }
  }, [tab, doneDate]);

  usePolling(loadDeliveries, RESTAURANT_POLL_MS, `${tab}:${doneDate}`);

  /** Contract 9.1: after a command, replace the cached delivery with the returned object. */
  const applyUpdate = (updated: Delivery) => {
    const replace = (list: Delivery[]) => list.map((item) => (item.id === updated.id ? updated : item));
    setActiveDeliveries((list) => (isActiveStatus(updated.status) ? replace(list) : list.filter((item) => item.id !== updated.id)));
    setDoneDeliveries((list) => replace(list));
    if (selectedId === updated.id) setSelectedSnapshot(updated);
  };

  const handleCreated = (created: Delivery) => {
    setActiveDeliveries((list) => [created, ...list.filter((item) => item.id !== created.id)]);
    setTab('active');
  };

  const handleReady = async (delivery: Delivery) => {
    setBusyId(delivery.id);
    try {
      applyUpdate(await markDeliveryReady(delivery.id));
      toast.success(`Livraison #${delivery.id} marquée prête au retrait.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de marquer la commande prête.'));
      if (parseApiError(error).status === 409) void loadDeliveries();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (deliveryId: number, reason: string) => {
    setBusyId(deliveryId);
    try {
      applyUpdate(await cancelDelivery(deliveryId, reason));
      setCancelTargetId(null);
      toast.success(`Livraison #${deliveryId} annulée.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible d’annuler la livraison.'));
      if (parseApiError(error).status === 409) void loadDeliveries();
    } finally {
      setBusyId(null);
    }
  };

  const visibleDeliveries = useMemo(
    () => (tab === 'active' ? activeDeliveries.filter((item) => isActiveStatus(item.status)) : doneDeliveries),
    [tab, activeDeliveries, doneDeliveries]
  );

  const selectedDelivery = useMemo(() => {
    if (selectedId === null) return null;
    const fromLists = [...activeDeliveries, ...doneDeliveries].find((item) => item.id === selectedId);
    if (fromLists && (!selectedSnapshot || fromLists.version >= selectedSnapshot.version)) return fromLists;
    return selectedSnapshot?.id === selectedId ? selectedSnapshot : fromLists ?? null;
  }, [selectedId, selectedSnapshot, activeDeliveries, doneDeliveries]);

  const openDelivery = (delivery: Delivery) => {
    setSelectedId(delivery.id);
    setSelectedSnapshot(delivery);
  };
  const closeDelivery = () => {
    setSelectedId(null);
    setSelectedSnapshot(null);
    setCancelTargetId(null);
  };

  const summaryCards = [
    { label: 'En attente de chauffeur', value: activeDeliveries.filter((item) => item.status === 'CREATED').length },
    { label: 'Chauffeur assigné', value: activeDeliveries.filter((item) => item.status === 'ASSIGNED').length },
    { label: 'En route', value: activeDeliveries.filter((item) => item.status === 'PICKED_UP' || item.status === 'IN_TRANSIT').length },
  ];

  const renderActions = (delivery: Delivery, inDrawer = false) => {
    const isBusy = busyId === delivery.id;
    return (
      <div className="flex flex-wrap gap-2">
        {canMarkReady(delivery.status) && !delivery.readyAt ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleReady(delivery)}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            Commande prête
          </button>
        ) : null}
        {canCancel(delivery.status) ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setCancelTargetId(delivery.id)}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-500 disabled:opacity-50"
          >
            Annuler
          </button>
        ) : null}
        {!inDrawer ? (
          <button
            type="button"
            onClick={() => openDelivery(delivery)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
          >
            Détails
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <AppShell
      title={restaurant?.name ?? 'Espace restaurant'}
      subtitle="Créez vos livraisons et suivez-les en direct"
    >
      <div className="space-y-6">
        {restaurantError ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            {restaurantError} Contactez l’administrateur de la plateforme.
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => void loadDeliveries()}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="text-sm text-slate-500">{card.label}</h3>
              <p className="mt-2 text-3xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Nouvelle livraison</h3>
              <p className="text-sm text-slate-500">Commande reçue par téléphone ou WhatsApp ? Saisissez-la ici.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((value) => !value)}
              aria-expanded={showForm}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
            >
              {showForm ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {showForm ? <CreateDeliveryForm onCreated={handleCreated} /> : null}
        </section>

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div role="tablist" aria-label="Livraisons" className="flex gap-2">
              {([
                ['active', 'En cours'],
                ['done', 'Terminées'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-full px-4 py-2 text-sm transition ${tab === id ? 'bg-black text-white' : 'border border-slate-200 text-slate-600 hover:border-black'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {tab === 'done' ? (
                <label className="flex items-center gap-2">
                  Date
                  <input
                    type="date"
                    value={doneDate}
                    max={todayInBrussels()}
                    onChange={(event) => setDoneDate(event.target.value || todayInBrussels())}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900"
                  />
                </label>
              ) : null}
              <span>
                {isLoading ? 'Chargement…' : lastSyncAt ? `Actualisé à ${formatTime(lastSyncAt)}` : ''}
              </span>
            </div>
          </div>

          {!isLoading && visibleDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              {tab === 'active' ? 'Aucune livraison en cours.' : 'Aucune livraison terminée ce jour-là.'}
            </div>
          ) : null}

          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleDeliveries.map((delivery) => (
              <li key={delivery.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-5" aria-label={`Livraison #${delivery.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900">
                      Livraison #{delivery.id}
                      {delivery.orderReference ? <span className="ml-2 text-sm font-normal text-slate-500">{delivery.orderReference}</span> : null}
                    </h4>
                    <p className="mt-1 truncate text-sm text-slate-600">{delivery.customerName ?? 'Client'} · {delivery.deliveryAddress}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={delivery.status} />
                    {delivery.readyAt && canMarkReady(delivery.status) ? <ReadyBadge /> : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Chauffeur</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {delivery.driver ? personName(delivery.driver.firstName, delivery.driver.lastName, `#${delivery.driver.id}`) : 'En attente'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">{getPaymentModeLabel(delivery.paymentMode)}</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {delivery.paymentMode === 'CASH_ON_DELIVERY' ? formatMoney(delivery.cashToCollect) : formatMoney(delivery.orderAmount)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Créée {formatElapsed(delivery.createdAt)}
                  {delivery.failureReason ? ` · Motif : ${delivery.failureReason}` : ''}
                  {delivery.cancellationReason ? ` · Motif : ${delivery.cancellationReason}` : ''}
                </p>

                <div className="mt-4 space-y-3">
                  {cancelTargetId === delivery.id && selectedId === null ? (
                    <CancelDeliveryDialog
                      deliveryId={delivery.id}
                      isSubmitting={busyId === delivery.id}
                      onConfirm={(reason) => void handleCancel(delivery.id, reason)}
                      onDismiss={() => setCancelTargetId(null)}
                    />
                  ) : (
                    renderActions(delivery)
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <DeliveryDetailDrawer
        delivery={selectedDelivery}
        onClose={closeDelivery}
        footer={
          selectedDelivery ? (
            <div className="space-y-3">
              {cancelTargetId === selectedDelivery.id ? (
                <CancelDeliveryDialog
                  deliveryId={selectedDelivery.id}
                  isSubmitting={busyId === selectedDelivery.id}
                  onConfirm={(reason) => void handleCancel(selectedDelivery.id, reason)}
                  onDismiss={() => setCancelTargetId(null)}
                />
              ) : (
                renderActions(selectedDelivery, true)
              )}
              {!canCancel(selectedDelivery.status) && isActiveStatus(selectedDelivery.status) ? (
                <p className="text-xs text-slate-500">La commande a quitté le restaurant : seul le chauffeur peut la clôturer.</p>
              ) : null}
            </div>
          ) : null
        }
      />
    </AppShell>
  );
};
