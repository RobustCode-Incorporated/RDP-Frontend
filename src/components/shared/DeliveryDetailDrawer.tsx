import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchDeliveryHistory } from '../../api/deliveryApi';
import { getApiErrorMessage } from '../../api/errors';
import type { Delivery, DeliveryHistory } from '../../api/types';
import { getHistoryEventLabel, getPaymentModeLabel } from '../../lib/deliveryStatus';
import { formatDateTime, formatMoney, formatTime, personName } from '../../lib/format';
import { isPositionStale } from '../../lib/geo';
import { DetailDrawer } from './DetailDrawer';
import { LiveMap } from './LiveMap';
import { buildDeliveryMapPoints, telLink } from '../../lib/deliveryView';
import { ReadyBadge, StatusBadge } from './StatusBadge';

interface DeliveryDetailDrawerProps {
  delivery: Delivery | null;
  onClose: () => void;
  footer?: ReactNode;
}

type HistoryState = { key: string; items: DeliveryHistory[]; error: string };

export function DeliveryDetailDrawer({ delivery, onClose, footer }: DeliveryDetailDrawerProps) {
  const [history, setHistory] = useState<HistoryState>({ key: '', items: [], error: '' });
  const historyKey = delivery ? `${delivery.id}:${delivery.version}` : '';

  useEffect(() => {
    if (!delivery) {
      return;
    }
    let active = true;
    const key = `${delivery.id}:${delivery.version}`;
    fetchDeliveryHistory(delivery.id)
      .then((items) => {
        if (active) setHistory({ key, items, error: '' });
      })
      .catch((error: unknown) => {
        if (active) setHistory({ key, items: [], error: getApiErrorMessage(error, 'Historique indisponible.') });
      });
    return () => {
      active = false;
    };
    // Reload when the delivery changes server side (version bump).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery?.id, delivery?.version]);

  const mapPoints = useMemo(() => (delivery ? buildDeliveryMapPoints(delivery) : []), [delivery]);
  const historyLoading = Boolean(delivery) && history.key !== historyKey;
  const isTerminal = delivery ? ['DELIVERED', 'FAILED', 'CANCELLED'].includes(delivery.status) : false;

  if (!delivery) {
    return <DetailDrawer isOpen={false} title="" subtitle="" sections={[]} onClose={onClose} />;
  }

  const driver = delivery.driver;
  const sections = [
    {
      title: 'Client',
      items: [
        { label: 'Nom', value: delivery.customerName ?? '—' },
        { label: 'Téléphone', value: telLink(delivery.customerPhone) },
        { label: 'Adresse de livraison', value: delivery.deliveryAddress },
        { label: 'Instructions', value: delivery.notes ?? '—' },
      ],
    },
    {
      title: 'Commande',
      items: [
        { label: 'Référence', value: delivery.orderReference ?? '—' },
        { label: 'Restaurant', value: delivery.restaurant.name },
        { label: 'Montant commande', value: formatMoney(delivery.orderAmount) },
        { label: 'Paiement', value: getPaymentModeLabel(delivery.paymentMode) },
        ...(delivery.paymentMode === 'CASH_ON_DELIVERY'
          ? [{ label: 'À encaisser', value: <span className="font-semibold text-amber-700">{formatMoney(delivery.cashToCollect)}</span> }]
          : []),
        { label: 'Frais de livraison', value: formatMoney(delivery.deliveryFee) },
        { label: 'Créée le', value: formatDateTime(delivery.createdAt) },
        { label: 'Prête le', value: formatDateTime(delivery.readyAt) },
        ...(delivery.description ? [{ label: 'Description', value: delivery.description }] : []),
      ],
    },
    {
      title: 'Chauffeur',
      items: driver
        ? [
            { label: 'Nom', value: personName(driver.firstName, driver.lastName, `Chauffeur #${driver.id}`) },
            { label: 'Téléphone', value: telLink(driver.phone) },
            { label: 'Véhicule', value: driver.vehicleType ?? '—' },
            {
              label: 'Dernière position',
              value: driver.lastLocationAt
                ? `${formatTime(driver.lastLocationAt)}${isPositionStale(driver.lastLocationAt) ? ' (ancienne)' : ''}`
                : 'Pas encore de position',
            },
          ]
        : [{ label: 'Affectation', value: 'Aucun chauffeur assigné pour le moment' }],
    },
  ];

  if (delivery.failureReason || delivery.cancellationReason) {
    sections.unshift({
      title: delivery.status === 'FAILED' ? 'Échec' : 'Annulation',
      items: [
        {
          label: 'Motif',
          value: delivery.failureReason ?? delivery.cancellationReason ?? '—',
        },
        { label: 'Le', value: formatDateTime(delivery.failedAt ?? delivery.cancelledAt) },
      ],
    });
  }

  return (
    <DetailDrawer
      isOpen
      title={`Livraison #${delivery.id}`}
      subtitle={`${delivery.customerName ?? 'Client'} · ${delivery.deliveryAddress}`}
      badge={
        <span className="flex flex-wrap gap-2">
          <StatusBadge status={delivery.status} />
          {delivery.readyAt && !isTerminal && delivery.status !== 'PICKED_UP' && delivery.status !== 'IN_TRANSIT' ? <ReadyBadge /> : null}
        </span>
      }
      sections={sections}
      footer={footer}
      onClose={onClose}
    >
      {mapPoints.length > 0 ? (
        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Carte</h3>
          <LiveMap points={mapPoints} heightClassName="h-[220px]" />
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Historique</h3>
        {historyLoading ? <p className="mt-4 text-sm text-slate-500">Chargement de l’historique…</p> : null}
        {!historyLoading && history.error ? <p className="mt-4 text-sm text-amber-700">{history.error}</p> : null}
        {!historyLoading && !history.error && history.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucun événement.</p>
        ) : null}
        {!historyLoading && history.items.length > 0 ? (
          <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4" aria-label="Historique de la livraison">
            {history.items.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-black" />
                <p className="text-sm font-medium text-slate-900">{getHistoryEventLabel(entry.event)}</p>
                {entry.note ? <p className="text-xs text-slate-600">{entry.note}</p> : null}
                <p className="text-xs text-slate-400">
                  {formatDateTime(entry.createdAt)} · {entry.changedBy}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </DetailDrawer>
  );
}
