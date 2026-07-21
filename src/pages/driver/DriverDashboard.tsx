import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DetailDrawer } from '../../components/shared/DetailDrawer';
import { useToast } from '../../components/feedback/ToastProvider';
import { useAuthStore } from '../../store/useAuthStore';
import {
  completeDelivery,
  failDelivery,
  fetchMyDeliveries,
  pickupDelivery,
  startDelivery,
  type DriverDeliveryDto,
} from '../../api/driverApi';
import { useAsyncError } from '../../hooks/useAsyncError';

type DeliverySummary = {
  id: number;
  pickupAddress: string;
  deliveryAddress: string;
  description: string;
  statusCode: DriverDeliveryDto['status'];
  statusLabel: string;
  createdAtLabel: string;
  restaurantLabel: string;
  customerLabel: string;
};

type SelectedDelivery = { id: number } | null;

const statusBadgeClasses: Record<DriverDeliveryDto['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  PICKED_UP: 'bg-amber-100 text-amber-700',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

const timelineSteps: Array<{ status: DriverDeliveryDto['status']; label: string }> = [
  { status: 'ASSIGNED', label: 'Assignée au chauffeur' },
  { status: 'PICKED_UP', label: 'Colis récupéré' },
  { status: 'IN_TRANSIT', label: 'En route' },
  { status: 'DELIVERED', label: 'Livrée' },
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const mapStatus = (status: DriverDeliveryDto['status']) => {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'ASSIGNED':
      return 'Affectée';
    case 'PICKED_UP':
      return 'Récupérée';
    case 'IN_TRANSIT':
      return 'En route';
    case 'DELIVERED':
      return 'Livrée';
    default:
      return 'Annulée';
  }
};

const getActionLabel = (status: DriverDeliveryDto['status']) => {
  switch (status) {
    case 'ASSIGNED':
      return 'Marquer comme récupérée';
    case 'PICKED_UP':
      return 'Démarrer la livraison';
    case 'IN_TRANSIT':
      return 'Marquer livrée';
    default:
      return null;
  }
};

const getLifecycleMessage = (status: DriverDeliveryDto['status']) => {
  switch (status) {
    case 'ASSIGNED':
      return 'La livraison attend la récupération au restaurant.';
    case 'PICKED_UP':
      return 'Le colis est récupéré, vous pouvez démarrer la route.';
    case 'IN_TRANSIT':
      return 'Le colis est en transit vers le client.';
    case 'DELIVERED':
      return 'La livraison a été finalisée.';
    default:
      return 'Aucune action disponible.';
  }
};

const canFailDelivery = (status: DriverDeliveryDto['status']) =>
  status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT';

export const DriverDashboard = () => {
  const { user } = useAuthStore();
  const toast = useToast();
  const throwAsyncError = useAsyncError();
  const [deliveries, setDeliveries] = useState<DriverDeliveryDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadMessage, setLoadMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<SelectedDelivery>(null);
  const [showFailForm, setShowFailForm] = useState(false);
  const [failReasonType, setFailReasonType] = useState('Client absent');
  const [failReasonDetail, setFailReasonDetail] = useState('');

  const loadDeliveries = async () => {
    setIsLoading(true);
    setLoadMessage('');
    setLoadError('');

    try {
      const response = await fetchMyDeliveries();
      setDeliveries(response);

      if (response.length === 0) {
        setLoadMessage('Aucune livraison assignée pour le moment.');
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throwAsyncError(error);
        return;
      }

      setDeliveries([]);
      setLoadError('Impossible de charger les livraisons du chauffeur.');
      toast.error('Chargement chauffeur indisponible.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDeliveries();
  }, []);

  const summaries = useMemo<DeliverySummary[]>(() => {
    return deliveries.map((delivery) => ({
      id: delivery.id,
      pickupAddress: delivery.pickupAddress,
      deliveryAddress: delivery.deliveryAddress,
      description: delivery.description ?? 'Aucune description',
      statusCode: delivery.status,
      statusLabel: mapStatus(delivery.status),
      createdAtLabel: formatDateTime(delivery.createdAt),
      restaurantLabel: delivery.restaurant?.name ?? `Restaurant #${delivery.restaurant?.id ?? '...'}`,
      customerLabel: delivery.customer
        ? `${delivery.customer.firstName ?? ''} ${delivery.customer.lastName ?? ''}`.trim() || `Client #${delivery.customer.id}`
        : 'Client inconnu',
    }));
  }, [deliveries]);

  const filteredDeliveries = summaries.filter((delivery) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      String(delivery.id).includes(normalizedSearch) ||
      delivery.pickupAddress.toLowerCase().includes(normalizedSearch) ||
      delivery.deliveryAddress.toLowerCase().includes(normalizedSearch) ||
      delivery.restaurantLabel.toLowerCase().includes(normalizedSearch) ||
      delivery.customerLabel.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || delivery.statusCode === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const summaryCards = [
    { label: 'Affectées', value: String(summaries.filter((delivery) => delivery.statusCode === 'ASSIGNED').length) },
    { label: 'En route', value: String(summaries.filter((delivery) => delivery.statusCode === 'PICKED_UP' || delivery.statusCode === 'IN_TRANSIT').length) },
    { label: 'Livrées', value: String(summaries.filter((delivery) => delivery.statusCode === 'DELIVERED').length) },
  ];

  const selectedSummary = selectedDelivery ? summaries.find((delivery) => delivery.id === selectedDelivery.id) ?? null : null;
  const selectedStepIndex = selectedSummary ? timelineSteps.findIndex((step) => step.status === selectedSummary.statusCode) : -1;

  useEffect(() => {
    setShowFailForm(false);
    setFailReasonType('Client absent');
    setFailReasonDetail('');
  }, [selectedDelivery?.id]);

  const timeline = timelineSteps.map((step, index) => {
    if (selectedStepIndex < 0) {
      return { ...step, state: 'upcoming' as const };
    }

    if (index < selectedStepIndex) {
      return { ...step, state: 'done' as const };
    }

    if (index === selectedStepIndex) {
      return { ...step, state: 'current' as const };
    }

    return { ...step, state: 'upcoming' as const };
  });

  const handleAction = async () => {
    if (!selectedDelivery || !selectedSummary) {
      return;
    }

    setIsSaving(true);
    setLoadMessage('');
    setLoadError('');

    try {
      if (selectedSummary.statusCode === 'ASSIGNED') {
        await pickupDelivery(selectedDelivery.id);
      } else if (selectedSummary.statusCode === 'PICKED_UP') {
        await startDelivery(selectedDelivery.id);
      } else if (selectedSummary.statusCode === 'IN_TRANSIT') {
        await completeDelivery(selectedDelivery.id);
      }

      await loadDeliveries();
      setLoadMessage('La livraison a été mise à jour avec succès.');
    } catch (error) {
      if (!(error instanceof Error)) {
        throwAsyncError(error);
        return;
      }

      setLoadError('Impossible de mettre à jour la livraison pour le moment.');
      toast.error('Échec de mise à jour de la livraison.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFailDelivery = async () => {
    if (!selectedDelivery || !selectedSummary || !canFailDelivery(selectedSummary.statusCode)) {
      return;
    }

    setIsSaving(true);
    setLoadMessage('');
    setLoadError('');

    const failurePayload = failReasonDetail.trim().length > 0
      ? `${failReasonType} - ${failReasonDetail.trim()}`
      : failReasonType;

    try {
      await failDelivery(selectedDelivery.id, failurePayload);
      await loadDeliveries();
      setShowFailForm(false);
      setFailReasonDetail('');
      setLoadMessage('La livraison a été marquée en échec et retirée du flux actif.');
    } catch (error) {
      if (!(error instanceof Error)) {
        throwAsyncError(error);
        return;
      }

      setLoadError('Impossible de signaler l’échec de la livraison pour le moment.');
      toast.error('Échec de signalement de livraison.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (loadMessage) {
      toast.success(loadMessage);
    }
  }, [loadMessage, toast]);

  return (
    <AppShell title="Driver Dashboard" subtitle={`Bienvenue, chauffeur #${user?.id ?? '...'}`}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Vue chauffeur</p>
            <h2 className="text-2xl font-semibold text-slate-900">Livraisons et progression du trajet</h2>
          </div>
          <p className="text-sm text-slate-500">{isLoading ? 'Chargement des livraisons assignées...' : 'Données synchronisées depuis les endpoints backend.'}</p>
        </div>

        {loadMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">{loadMessage}</div>
        ) : null}

        {loadError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={loadDeliveries}
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
                placeholder="Commande, restaurant, client..."
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
                <option value="ASSIGNED">Affectée</option>
                <option value="PICKED_UP">Récupérée</option>
                <option value="IN_TRANSIT">En route</option>
                <option value="DELIVERED">Livrée</option>
                <option value="CANCELLED">Annulée</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Livraisons à traiter</h3>
              <p className="text-sm text-slate-500">Workflow chauffeur du retrait à la remise client.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{filteredDeliveries.length} livraisons</span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Chargement des livraisons...</div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredDeliveries.map((delivery) => (
              <button
                key={delivery.id}
                type="button"
                onClick={() => setSelectedDelivery({ id: delivery.id })}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Livraison #{delivery.id}</h4>
                    <p className="mt-1 text-sm text-slate-500">{delivery.restaurantLabel}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses[delivery.statusCode]}`}>{delivery.statusLabel}</span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Retrait</p>
                    <p className="mt-1 font-semibold text-slate-900">{delivery.pickupAddress}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Destination</p>
                    <p className="mt-1 font-semibold text-slate-900">{delivery.deliveryAddress}</p>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Cliquer pour voir le trajet</p>
              </button>
            ))}
          </div>

          {!isLoading && filteredDeliveries.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Aucune livraison ne correspond aux critères sélectionnés.
            </div>
          ) : null}
        </section>
      </div>

      <DetailDrawer
        isOpen={selectedDelivery !== null}
        title={selectedSummary ? `Livraison #${selectedSummary.id}` : ''}
        subtitle={selectedSummary ? 'Progression chauffeur et remise client' : ''}
        badge={selectedSummary ? <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClasses[selectedSummary.statusCode]}`}>{selectedSummary.statusLabel}</span> : undefined}
        sections={selectedSummary ? [
          {
            title: 'Trajet',
            items: [
              { label: 'Restaurant', value: selectedSummary.restaurantLabel },
              { label: 'Client', value: selectedSummary.customerLabel },
              { label: 'Retrait', value: selectedSummary.pickupAddress },
              { label: 'Destination', value: selectedSummary.deliveryAddress },
              { label: 'Créée le', value: selectedSummary.createdAtLabel },
            ],
          },
          {
            title: 'Progression',
            items: [
              {
                label: 'Étape actuelle',
                value: <p className="font-medium text-slate-900">{getLifecycleMessage(selectedSummary.statusCode)}</p>,
              },
              {
                label: 'Timeline',
                value: (
                  <div className="space-y-2">
                    {timeline.map((step) => (
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
        ] : []}
        footer={selectedSummary ? (
          <div className="space-y-4">
            {getActionLabel(selectedSummary.statusCode) ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleAction}
                  className="rounded-full bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Mise à jour...' : getActionLabel(selectedSummary.statusCode)}
                </button>

                {canFailDelivery(selectedSummary.statusCode) ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setShowFailForm((value) => !value)}
                    className="rounded-full border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:border-rose-500 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Signaler un échec
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune action chauffeur disponible pour ce statut.</p>
            )}

            {showFailForm && canFailDelivery(selectedSummary.statusCode) ? (
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-800">Signaler un échec de livraison</p>

                <label className="flex flex-col gap-2 text-sm text-rose-800">
                  Motif principal
                  <select
                    value={failReasonType}
                    onChange={(event) => setFailReasonType(event.target.value)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-rose-500"
                  >
                    <option value="Client absent">Client absent</option>
                    <option value="Adresse introuvable">Adresse introuvable</option>
                    <option value="Refus du client">Refus du client</option>
                    <option value="Incident de trajet">Incident de trajet</option>
                    <option value="Problème colis">Problème colis</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-rose-800">
                  Détails (optionnel)
                  <textarea
                    value={failReasonDetail}
                    onChange={(event) => setFailReasonDetail(event.target.value)}
                    maxLength={120}
                    rows={3}
                    placeholder="Ajoutez un détail utile pour le support ou le restaurant"
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-rose-500"
                  />
                </label>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleFailDelivery}
                  className="rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirmer l’échec
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Les mises à jour sont envoyées vers les endpoints de livraison.</p>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-black hover:text-black"
              >
                Fermer le détail
              </button>
            </div>
          </div>
        ) : null}
        onClose={() => setSelectedDelivery(null)}
      />
    </AppShell>
  );
};
