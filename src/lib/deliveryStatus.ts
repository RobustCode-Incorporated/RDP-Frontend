import type { AvailabilityStatus, DeliveryStatus, HistoryEvent } from '../api/types';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  CREATED: 'Créée',
  ASSIGNED: 'Assignée',
  PICKED_UP: 'Récupérée',
  IN_TRANSIT: 'En route',
  DELIVERED: 'Livrée',
  FAILED: 'Échec',
  CANCELLED: 'Annulée',
};

export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-indigo-100 text-indigo-700',
  PICKED_UP: 'bg-amber-100 text-amber-800',
  IN_TRANSIT: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-200 text-slate-700',
};

export const ALL_DELIVERY_STATUSES: DeliveryStatus[] = [
  'CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED',
];
export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];
export const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = ['DELIVERED', 'FAILED', 'CANCELLED'];

/** Contract 3.1: tolerate unknown enum values by showing the raw value. */
export const getDeliveryStatusLabel = (status: string) =>
  DELIVERY_STATUS_LABELS[status as DeliveryStatus] ?? status;

export const getDeliveryStatusClasses = (status: string) =>
  DELIVERY_STATUS_CLASSES[status as DeliveryStatus] ?? 'bg-slate-100 text-slate-600';

export const isActiveStatus = (status: string) => ACTIVE_DELIVERY_STATUSES.includes(status as DeliveryStatus);

/** Restaurant/admin can cancel only before pickup (contract 4.8). */
export const canCancel = (status: string) => status === 'CREATED' || status === 'ASSIGNED';
/** Food can be marked ready only before pickup (contract 4.7). */
export const canMarkReady = (status: string) => status === 'CREATED' || status === 'ASSIGNED';
/** Assign / reassign only before pickup (contract 4.6). */
export const canAssign = (status: string) => status === 'CREATED' || status === 'ASSIGNED';
/** Driver may fail once assigned and until delivered (contract 4.9). */
export const canFail = (status: string) => status === 'ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT';

export const HISTORY_EVENT_LABELS: Record<HistoryEvent, string> = {
  CREATED: 'Livraison créée',
  ASSIGNED: 'Chauffeur assigné',
  REASSIGNED: 'Chauffeur réassigné',
  READY: 'Commande prête',
  PICKED_UP: 'Commande récupérée',
  IN_TRANSIT: 'En route vers le client',
  DELIVERED: 'Livrée',
  FAILED: 'Échec de livraison',
  CANCELLED: 'Annulée',
  MIGRATED: 'Importée (v1)',
};

export const getHistoryEventLabel = (event: string) => HISTORY_EVENT_LABELS[event as HistoryEvent] ?? event;

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'Disponible',
  BUSY: 'En livraison',
  OFFLINE: 'Hors ligne',
};

export const AVAILABILITY_CLASSES: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  BUSY: 'bg-amber-100 text-amber-800',
  OFFLINE: 'bg-slate-200 text-slate-700',
};

export const getAvailabilityLabel = (status: string) => AVAILABILITY_LABELS[status as AvailabilityStatus] ?? status;
export const getAvailabilityClasses = (status: string) =>
  AVAILABILITY_CLASSES[status as AvailabilityStatus] ?? 'bg-slate-100 text-slate-600';

export const PAYMENT_MODE_LABELS = {
  PREPAID: 'Prépayée',
  CASH_ON_DELIVERY: 'Paiement à la livraison',
} as const;

export const getPaymentModeLabel = (mode: string) => PAYMENT_MODE_LABELS[mode as keyof typeof PAYMENT_MODE_LABELS] ?? mode;
