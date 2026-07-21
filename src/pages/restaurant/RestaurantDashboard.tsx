import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DetailDrawer } from '../../components/shared/DetailDrawer';
import { useToast } from '../../components/feedback/ToastProvider';
import { useAuthStore } from '../../store/useAuthStore';
import { useAsyncError } from '../../hooks/useAsyncError';
import {
  acceptRestaurantOrder,
  fetchRestaurantOrders,
  fetchRestaurantOrderHistory,
  readyRestaurantOrder,
  startPreparingRestaurantOrder,
  type RestaurantOrderHistoryDto,
  type RestaurantOrderDto,
} from '../../api/restaurantApi';

type RestaurantOrderSummary = {
  id: number;
  customerLabel: string;
  driverLabel: string;
  statusCode: RestaurantOrderDto['status'];
  statusLabel: string;
  totalAmountLabel: string;
  createdAtLabel: string;
  restaurantId: number;
};

type SelectedOrder = { id: number } | null;

const statusBadgeClasses: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-indigo-100 text-indigo-700',
  PREPARING: 'bg-amber-100 text-amber-700',
  READY_FOR_PICKUP: 'bg-fuchsia-100 text-fuchsia-700',
  PICKED_UP: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const workflowSteps: Array<{ status: RestaurantOrderDto['status']; label: string }> = [
  { status: 'PENDING', label: 'Nouvelle commande' },
  { status: 'ACCEPTED', label: 'Commande acceptée' },
  { status: 'PREPARING', label: 'Préparation en cours' },
  { status: 'READY_FOR_PICKUP', label: 'Prête pour pickup' },
  { status: 'PICKED_UP', label: 'Récupérée par le chauffeur' },
  { status: 'DELIVERED', label: 'Livrée' },
];

const formatMoney = (value: string) => {
  const amount = Number.parseFloat(value);

  if (Number.isNaN(amount)) {
    return `${value} FCFA`;
  }

  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount)} FCFA`;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const mapStatus = (status: RestaurantOrderDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'ACCEPTED':
      return 'Acceptée';
    case 'PREPARING':
      return 'Préparation';
    case 'READY_FOR_PICKUP':
      return 'Prête pour pickup';
    case 'PICKED_UP':
      return 'En livraison';
    case 'DELIVERED':
      return 'Livrée';
    default:
      return 'Annulée';
  }
};

const getAvailableActionLabel = (status: RestaurantOrderDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Accepter la commande';
    case 'ACCEPTED':
      return 'Commencer la préparation';
    case 'PREPARING':
      return 'Marquer prête';
    default:
      return null;
  }
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const getHandoffLabel = (status: RestaurantOrderDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'En attente de validation par la cuisine.';
    case 'ACCEPTED':
      return 'Commande acceptée, la cuisine peut commencer la préparation.';
    case 'PREPARING':
      return 'La commande est en cours de préparation.';
    case 'READY_FOR_PICKUP':
      return 'Commande prête pour la remise au chauffeur.';
    case 'PICKED_UP':
      return 'La commande a quitté le restaurant avec le chauffeur.';
    case 'DELIVERED':
      return 'La commande a été livrée au client.';
    default:
      return 'La commande a été annulée.';
  }
};

const getHistoryLabel = (status: RestaurantOrderDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'Créée';
    case 'ACCEPTED':
      return 'Acceptée';
    case 'PREPARING':
      return 'Préparation';
    case 'READY_FOR_PICKUP':
      return 'Prête pour pickup';
    case 'PICKED_UP':
      return 'Récupérée par le chauffeur';
    case 'DELIVERED':
      return 'Livrée';
    default:
      return 'Annulée';
  }
};

export const RestaurantDashboard = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const throwAsyncError = useAsyncError();
  const [orders, setOrders] = useState<RestaurantOrderDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadMessage, setLoadMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder>(null);
  const [selectedHistory, setSelectedHistory] = useState<RestaurantOrderHistoryDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const loadRestaurantOrders = async () => {
    setIsLoading(true);
    setLoadMessage('');
    setLoadError('');

    try {
      const response = await fetchRestaurantOrders();
      setOrders(response);

      if (response.length === 0) {
        setLoadMessage('Aucune commande n’est disponible pour le moment.');
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throwAsyncError(error);
        return;
      }

      setOrders([]);
      setLoadError('Impossible de charger les commandes du restaurant.');
      toast.error('Chargement restaurant indisponible.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRestaurantOrders();
  }, []);

  const summaries = useMemo<RestaurantOrderSummary[]>(() => {
    return orders.map((order) => ({
      id: order.id,
      customerLabel: `Client #${order.customerId}`,
      driverLabel: order.driverId ? `Chauffeur #${order.driverId}` : 'Non assigné',
      statusCode: order.status,
      statusLabel: mapStatus(order.status),
      totalAmountLabel: formatMoney(order.totalAmount),
      createdAtLabel: formatDateTime(order.createdAt),
      restaurantId: order.restaurantId,
    }));
  }, [orders]);

  const filteredOrders = summaries.filter((order) => {
    const matchesSearch =
      normalizeText(String(order.id)).includes(normalizeText(searchTerm)) ||
      normalizeText(order.customerLabel).includes(normalizeText(searchTerm)) ||
      normalizeText(order.driverLabel).includes(normalizeText(searchTerm));
    const matchesStatus = statusFilter === 'all' || order.statusCode === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const summaryCards = [
    { label: 'Commandes à traiter', value: String(summaries.filter((order) => order.statusCode === 'PENDING').length) },
    { label: 'En préparation', value: String(summaries.filter((order) => order.statusCode === 'ACCEPTED' || order.statusCode === 'PREPARING').length) },
    { label: 'Prêtes / en livraison', value: String(summaries.filter((order) => order.statusCode === 'READY_FOR_PICKUP' || order.statusCode === 'PICKED_UP').length) },
  ];

  const selectedSummary = selectedOrder ? summaries.find((order) => order.id === selectedOrder.id) ?? null : null;

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedHistory([]);
      setHistoryLoading(false);
      setHistoryError('');
      return;
    }

    let isActive = true;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError('');

      try {
        const response = await fetchRestaurantOrderHistory(selectedOrder.id);

        if (!isActive) {
          return;
        }

        if (response.length === 0) {
          setSelectedHistory([]);
          setHistoryError('Aucun historique de statut n’est renvoyé par le backend.');
          return;
        }

        setSelectedHistory(response);
      } catch (error) {
        if (!(error instanceof Error)) {
          throwAsyncError(error);
          return;
        }

        if (!isActive) {
          return;
        }

        setSelectedHistory([]);
        setHistoryError('Impossible de charger l’historique du statut.');
      } finally {
        if (isActive) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [selectedOrder?.id, selectedSummary?.statusCode]);

  const selectedWorkflowIndex = selectedSummary
    ? workflowSteps.findIndex((step) => step.status === selectedSummary.statusCode)
    : -1;

  const workflowStatus = workflowSteps.map((step, index) => {
    if (selectedWorkflowIndex < 0) {
      return { ...step, state: 'upcoming' as const };
    }

    if (index < selectedWorkflowIndex) {
      return { ...step, state: 'done' as const };
    }

    if (index === selectedWorkflowIndex) {
      return { ...step, state: 'current' as const };
    }

    return { ...step, state: 'upcoming' as const };
  });

  const selectedHistoryItems = selectedHistory.map((historyEvent) => ({
    id: historyEvent.id,
    title: getHistoryLabel(historyEvent.newStatus),
    value: (
      <div className="space-y-1">
        <p className="font-medium text-slate-900">
          {historyEvent.oldStatus ? `${getHistoryLabel(historyEvent.oldStatus)} → ${getHistoryLabel(historyEvent.newStatus)}` : getHistoryLabel(historyEvent.newStatus)}
        </p>
        <p className="text-xs text-slate-500">Par {historyEvent.changedBy}</p>
        <p className="text-xs text-slate-400">{formatDateTime(historyEvent.createdAt)}</p>
      </div>
    ),
  }));

  const handleAction = async () => {
    if (!selectedOrder || !selectedSummary) {
      return;
    }

    const activeStatus = selectedSummary.statusCode;
    setIsSaving(true);
    setLoadMessage('');
    setLoadError('');

    try {
      if (activeStatus === 'PENDING') {
        await acceptRestaurantOrder(selectedOrder.id);
      } else if (activeStatus === 'ACCEPTED') {
        await startPreparingRestaurantOrder(selectedOrder.id);
      } else if (activeStatus === 'PREPARING') {
        await readyRestaurantOrder(selectedOrder.id);
      }

      await loadRestaurantOrders();
      setLoadMessage('La commande a été mise à jour avec succès.');
    } catch (error) {
      if (!(error instanceof Error)) {
        throwAsyncError(error);
        return;
      }

      setLoadError('Impossible de mettre à jour la commande pour le moment.');
      toast.error('Échec de mise à jour de la commande.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (loadMessage) {
      toast.success(loadMessage);
    }
  }, [loadMessage, toast]);

  const openOrder = (orderId: number) => setSelectedOrder({ id: orderId });
  const closeOrder = () => setSelectedOrder(null);

  return (
    <AppShell title="Restaurant Dashboard" subtitle={`Bienvenue, restaurant #${user?.id ?? '...'}`}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vue restaurant</p>
            <h2 className="text-2xl font-semibold text-slate-900">Commandes et workflow opérationnel</h2>
          </div>
          <p className="text-sm text-slate-500">
            {isLoading ? 'Chargement des commandes restaurant...' : 'Données synchronisées depuis les endpoints backend.'}
          </p>
        </div>

        {loadMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            {loadMessage}
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={loadRestaurantOrders}
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

        <section className="rounded-3xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600">
              Rechercher
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Commande, client, chauffeur..."
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 md:min-w-[220px]">
              Statut
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black"
              >
                <option value="all">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="ACCEPTED">Acceptée</option>
                <option value="PREPARING">Préparation</option>
                <option value="READY_FOR_PICKUP">Prête pour pickup</option>
                <option value="PICKED_UP">En livraison</option>
                <option value="DELIVERED">Livrée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Commandes à traiter</h3>
              <p className="text-sm text-slate-500">Flux des commandes et progression du workflow.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {filteredOrders.length} commandes
            </span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Chargement des commandes...
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order.id)}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Commande #{order.id}</h4>
                    <p className="mt-1 text-sm text-slate-500">{order.customerLabel}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses[order.statusCode] ?? 'bg-slate-100 text-slate-600'}`}>
                    {order.statusLabel}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Montant</p>
                    <p className="mt-1 font-semibold text-slate-900">{order.totalAmountLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Chauffeur</p>
                    <p className="mt-1 font-semibold text-slate-900">{order.driverLabel}</p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Cliquer pour voir le workflow
                </p>
              </button>
            ))}
          </div>

          {!isLoading && filteredOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Aucune commande ne correspond aux critères sélectionnés.
            </div>
          ) : null}
        </section>
      </div>

      <DetailDrawer
        isOpen={selectedOrder !== null}
        title={selectedSummary ? `Commande #${selectedSummary.id}` : ''}
        subtitle={selectedSummary ? 'Workflow restaurant et progression opérationnelle' : ''}
        badge={selectedSummary ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses[selectedSummary.statusCode] ?? 'bg-slate-100 text-slate-600'}`}>{selectedSummary.statusLabel}</span> : undefined}
        sections={selectedSummary ? [
          {
            title: 'Résumé',
            items: [
              { label: 'Statut', value: selectedSummary.statusLabel },
              { label: 'Client', value: selectedSummary.customerLabel },
              { label: 'Chauffeur', value: selectedSummary.driverLabel },
              { label: 'Montant', value: selectedSummary.totalAmountLabel },
              { label: 'Créée le', value: selectedSummary.createdAtLabel },
            ],
          },
          {
            title: 'Remise et livraison',
            items: [
              {
                label: 'Handoff',
                value: (
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{getHandoffLabel(selectedSummary.statusCode)}</p>
                    <p className="text-xs text-slate-500">{selectedSummary.driverLabel}</p>
                  </div>
                ),
              },
              {
                label: 'Progression',
                value: (
                  <div className="space-y-2">
                    {workflowStatus.map((step) => (
                      <div key={step.status} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                        <span className="text-sm text-slate-700">{step.label}</span>
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          {step.state === 'done' ? 'Terminée' : step.state === 'current' ? 'En cours' : 'À venir'}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
              },
            ],
          },
          {
            title: 'Historique de statut',
            items: [
              {
                label: historyError ? 'Historique dégradé' : historyLoading ? 'Chargement' : 'Derniers changements',
                value: historyLoading ? (
                  <p className="text-sm text-slate-500">Chargement de l’historique de statut...</p>
                ) : (
                  <div className="space-y-3">
                    {historyError ? <p className="text-sm text-amber-700">{historyError}</p> : null}
                    {selectedHistoryItems.length > 0 ? (
                      selectedHistoryItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.title}</p>
                          <div className="mt-2">{item.value}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Aucun événement disponible pour cette commande.</p>
                    )}
                  </div>
                ),
              },
            ],
          },
        ] : []}
        footer={selectedSummary ? (
          <div className="space-y-4">
            {getAvailableActionLabel(selectedSummary.statusCode) ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleAction}
                className="rounded-full bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Mise à jour...' : getAvailableActionLabel(selectedSummary.statusCode)}
              </button>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <p>Aucune action restaurant disponible pour ce statut.</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {selectedSummary.statusCode === 'READY_FOR_PICKUP'
                    ? 'La commande attend la prise en charge du chauffeur.'
                    : selectedSummary.statusCode === 'PICKED_UP'
                      ? 'La commande est désormais en livraison.'
                      : selectedSummary.statusCode === 'DELIVERED'
                        ? 'La livraison est terminée.'
                        : 'Le workflow ne propose plus d’action côté restaurant.'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Les changements sont envoyés vers les endpoints restaurant.</p>
              <button
                type="button"
                onClick={closeOrder}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
              >
                Fermer le détail
              </button>
            </div>
          </div>
        ) : null}
        onClose={closeOrder}
      />
    </AppShell>
  );
};
