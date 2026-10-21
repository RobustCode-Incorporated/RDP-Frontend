import { useCallback, useMemo, useState } from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { DetailDrawer } from '../../components/shared/DetailDrawer';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useToast } from '../../components/feedback/toastContext';
import { usePolling } from '../../hooks/usePolling';
import {
  completeDelivery,
  failDelivery,
  fetchMyDeliveries,
  pickupDelivery,
  startDelivery,
} from '../../api/driverApi';
import { getApiErrorMessage, parseApiError } from '../../api/errors';
import type { Delivery, DeliveryStatus } from '../../api/types';
import { canFail, getPaymentModeLabel, isActiveStatus } from '../../lib/deliveryStatus';
import { formatDateTime, formatMoney } from '../../lib/format';
import { telLink } from '../../lib/deliveryView';

/** Contract 9.1: driver refreshes `/me` every 30 s. */
export const DRIVER_POLL_MS = 30000;
export const FAIL_REASON_MAX = 180;

const FAIL_REASONS = ['Client absent', 'Adresse introuvable', 'Refus du client', 'Incident de trajet', 'Problème colis'];

const NEXT_ACTION: Partial<Record<DeliveryStatus, { label: string; run: (id: number) => Promise<Delivery>; done: string }>> = {
  ASSIGNED: { label: 'Marquer comme récupérée', run: pickupDelivery, done: 'Commande récupérée au restaurant.' },
  PICKED_UP: { label: 'Démarrer la livraison', run: startDelivery, done: 'Livraison démarrée.' },
  IN_TRANSIT: { label: 'Marquer livrée', run: completeDelivery, done: 'Livraison terminée. Merci !' },
};

const LIFECYCLE_MESSAGE: Record<DeliveryStatus, string> = {
  CREATED: 'En attente d’affectation.',
  ASSIGNED: 'Rendez-vous au restaurant pour récupérer la commande.',
  PICKED_UP: 'Commande récupérée : démarrez la livraison.',
  IN_TRANSIT: 'En route vers le client.',
  DELIVERED: 'Livraison terminée.',
  FAILED: 'Livraison en échec.',
  CANCELLED: 'Livraison annulée par le restaurant ou l’administrateur.',
};

type Tab = 'active' | 'history';

export const DriverDashboard = () => {
  const toast = useToast();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showFailForm, setShowFailForm] = useState(false);
  const [failReasonType, setFailReasonType] = useState(FAIL_REASONS[0]);
  const [failReasonDetail, setFailReasonDetail] = useState('');
  const [cashConfirmed, setCashConfirmed] = useState(false);

  const loadDeliveries = useCallback(async () => {
    try {
      setDeliveries(await fetchMyDeliveries());
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Impossible de charger vos livraisons.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  usePolling(loadDeliveries, DRIVER_POLL_MS);

  const replaceDelivery = (updated: Delivery) =>
    setDeliveries((list) => list.map((item) => (item.id === updated.id ? updated : item)));

  const handleCommandError = (error: unknown, fallback: string) => {
    const parsed = parseApiError(error, fallback);
    toast.error(parsed.message);
    // 409 (state changed) or 403 (reassigned): reload the server state.
    if (parsed.status === 409 || parsed.status === 403) void loadDeliveries();
  };

  const visible = useMemo(
    () => deliveries.filter((item) => (tab === 'active' ? isActiveStatus(item.status) : !isActiveStatus(item.status))),
    [deliveries, tab]
  );

  const selected = deliveries.find((item) => item.id === selectedId) ?? null;
  const nextAction = selected ? NEXT_ACTION[selected.status] : undefined;
  const needsCash = selected?.status === 'IN_TRANSIT' && selected.paymentMode === 'CASH_ON_DELIVERY';

  const openDelivery = (id: number) => {
    setSelectedId(id);
    setShowFailForm(false);
    setFailReasonType(FAIL_REASONS[0]);
    setFailReasonDetail('');
    setCashConfirmed(false);
  };

  const handleAction = async () => {
    if (!selected || !nextAction) return;
    setIsSaving(true);
    try {
      replaceDelivery(await nextAction.run(selected.id));
      toast.success(nextAction.done);
    } catch (error) {
      handleCommandError(error, 'Impossible de mettre à jour la livraison.');
    } finally {
      setIsSaving(false);
    }
  };

  const failReason = (failReasonDetail.trim() ? `${failReasonType} - ${failReasonDetail.trim()}` : failReasonType).slice(0, FAIL_REASON_MAX);

  const handleFail = async () => {
    if (!selected || !canFail(selected.status) || !failReason.trim()) return;
    setIsSaving(true);
    try {
      replaceDelivery(await failDelivery(selected.id, failReason));
      setShowFailForm(false);
      toast.success('Échec signalé. Le restaurant et le dispatch sont prévenus.');
    } catch (error) {
      handleCommandError(error, 'Impossible de signaler l’échec.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = deliveries.filter((item) => isActiveStatus(item.status)).length;

  return (
    <AppShell title="Espace chauffeur" subtitle="Vos livraisons du jour (l’application mobile reste l’outil principal)">
      <div className="space-y-6">
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

        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Livraisons" className="flex gap-2">
              {([
                ['active', `À faire (${activeCount})`],
                ['history', 'Historique'],
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
            <p className="text-sm text-slate-500">{isLoading ? 'Chargement des livraisons assignées...' : 'Actualisation automatique toutes les 30 s.'}</p>
          </div>

          {!isLoading && visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              {tab === 'active' ? 'Aucune livraison à faire pour le moment.' : 'Aucune livraison terminée.'}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visible.map((delivery) => (
              <button
                key={delivery.id}
                type="button"
                onClick={() => openDelivery(delivery.id)}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">Livraison #{delivery.id}</h4>
                    <p className="mt-1 text-sm text-slate-500">{delivery.restaurant.name} → {delivery.customerName ?? 'Client'}</p>
                  </div>
                  <StatusBadge status={delivery.status} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Retrait</p>
                    <p className="mt-1 font-semibold text-slate-900">{delivery.pickupAddress}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-slate-400">Destination</p>
                    <p className="mt-1 font-semibold text-slate-900">{delivery.deliveryAddress}</p>
                  </div>
                </div>
                {delivery.paymentMode === 'CASH_ON_DELIVERY' && isActiveStatus(delivery.status) ? (
                  <p className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Cash à encaisser : {formatMoney(delivery.cashToCollect)}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      </div>

      <DetailDrawer
        isOpen={selected !== null}
        title={selected ? `Livraison #${selected.id}` : ''}
        subtitle={selected ? LIFECYCLE_MESSAGE[selected.status] ?? selected.status : ''}
        badge={selected ? <StatusBadge status={selected.status} /> : undefined}
        sections={selected ? [
          {
            title: 'Retrait',
            items: [
              { label: 'Restaurant', value: selected.restaurant.name },
              { label: 'Téléphone', value: telLink(selected.restaurant.phone) },
              { label: 'Adresse', value: selected.pickupAddress },
              { label: 'Prête', value: selected.readyAt ? `Oui (${formatDateTime(selected.readyAt)})` : 'Pas encore' },
            ],
          },
          {
            title: 'Client',
            items: [
              { label: 'Nom', value: selected.customerName ?? '—' },
              { label: 'Téléphone', value: telLink(selected.customerPhone) },
              { label: 'Adresse', value: selected.deliveryAddress },
              { label: 'Instructions', value: selected.notes ?? '—' },
            ],
          },
          {
            title: 'Paiement',
            items: [
              { label: 'Mode', value: getPaymentModeLabel(selected.paymentMode) },
              {
                label: 'À encaisser',
                value: selected.paymentMode === 'CASH_ON_DELIVERY'
                  ? <span className="text-lg font-bold text-amber-700">{formatMoney(selected.cashToCollect)}</span>
                  : 'Rien (prépayée)',
              },
              ...(selected.failureReason ? [{ label: 'Motif d’échec', value: selected.failureReason }] : []),
              ...(selected.cancellationReason ? [{ label: 'Motif d’annulation', value: selected.cancellationReason }] : []),
            ],
          },
        ] : []}
        footer={selected ? (
          <div className="space-y-4">
            {needsCash ? (
              <label className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                <input
                  type="checkbox"
                  checked={cashConfirmed}
                  onChange={(event) => setCashConfirmed(event.target.checked)}
                />
                J’ai encaissé {formatMoney(selected.cashToCollect)} auprès du client
              </label>
            ) : null}

            {nextAction ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isSaving || (needsCash && !cashConfirmed)}
                  onClick={() => void handleAction()}
                  className="rounded-full bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Mise à jour...' : nextAction.label}
                </button>
                {canFail(selected.status) ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setShowFailForm((value) => !value)}
                    className="rounded-full border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:border-rose-500 disabled:opacity-50"
                  >
                    Signaler un échec
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucune action disponible pour ce statut.</p>
            )}

            {showFailForm && canFail(selected.status) ? (
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <label className="flex flex-col gap-2 text-sm text-rose-800">
                  Motif principal
                  <select
                    value={failReasonType}
                    onChange={(event) => setFailReasonType(event.target.value)}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900"
                  >
                    {FAIL_REASONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-rose-800">
                  Détails (optionnel)
                  <textarea
                    value={failReasonDetail}
                    onChange={(event) => setFailReasonDetail(event.target.value)}
                    maxLength={FAIL_REASON_MAX - failReasonType.length - 3}
                    rows={3}
                    className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleFail()}
                  className="rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
                >
                  Confirmer l’échec
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        onClose={() => setSelectedId(null)}
      />
    </AppShell>
  );
};
