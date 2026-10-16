import { useState } from 'react';

interface CancelDeliveryDialogProps {
  deliveryId: number;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
  onDismiss: () => void;
}

/** Inline confirmation with an optional reason (contract 4.8: reason optional, max 500). */
export function CancelDeliveryDialog({ deliveryId, isSubmitting, onConfirm, onDismiss }: CancelDeliveryDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <div
      role="alertdialog"
      aria-label={`Annuler la livraison #${deliveryId}`}
      className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4"
    >
      <p className="text-sm font-medium text-rose-800">Annuler la livraison #{deliveryId} ?</p>
      <label className="flex flex-col gap-2 text-sm text-rose-800">
        Motif (optionnel)
        <textarea
          value={reason}
          maxLength={500}
          rows={2}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Client a annulé, commande en double…"
          className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-rose-500"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onConfirm(reason)}
          className="rounded-full bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Annulation…' : 'Confirmer l’annulation'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
