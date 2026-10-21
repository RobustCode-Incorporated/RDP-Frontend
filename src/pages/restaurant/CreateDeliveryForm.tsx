import { useState, type FormEvent } from 'react';
import { createDelivery } from '../../api/deliveryApi';
import { parseApiError } from '../../api/errors';
import type { Delivery, PaymentMode } from '../../api/types';
import { AddressAutocomplete } from '../../components/shared/AddressAutocomplete';
import { useToast } from '../../components/feedback/toastContext';
import {
  EMPTY_DELIVERY_FORM,
  toCreateDeliveryRequest,
  validateDeliveryForm,
  type DeliveryFieldErrors as FieldErrors,
  type DeliveryFormValues,
} from './deliveryForm';

// Server field names that are displayed under another input.
const FIELD_ALIASES: Record<string, string> = {
  deliveryLatitude: 'deliveryAddress',
  deliveryLongitude: 'deliveryAddress',
};

const inputClass = (hasError: boolean) =>
  `rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-black ${hasError ? 'border-rose-400' : 'border-slate-200'}`;

interface CreateDeliveryFormProps {
  onCreated: (delivery: Delivery) => void;
}

export function CreateDeliveryForm({ onCreated }: CreateDeliveryFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<DeliveryFormValues>(EMPTY_DELIVERY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof DeliveryFormValues>(key: K, value: DeliveryFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const selectPaymentMode = (mode: PaymentMode) => {
    setValues((current) => ({
      ...current,
      paymentMode: mode,
      // Convenience: prefill the cash amount with the order amount.
      cashToCollect: mode === 'CASH_ON_DELIVERY' ? current.cashToCollect || current.orderAmount : '',
    }));
    setErrors((current) => ({ ...current, paymentMode: undefined, cashToCollect: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const clientErrors = validateDeliveryForm(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createDelivery(toCreateDeliveryRequest(values));
      toast.success(`Livraison #${created.id} créée. Le dispatch va assigner un chauffeur.`);
      setValues(EMPTY_DELIVERY_FORM);
      setErrors({});
      onCreated(created);
    } catch (error) {
      const parsed = parseApiError(error, 'Impossible de créer la livraison.');
      const mapped: FieldErrors = {};
      Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
        mapped[FIELD_ALIASES[field] ?? field] = message;
      });
      setErrors(mapped);
      setFormError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-rose-600">{errors[key]}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Nouvelle livraison" className="space-y-4">
      {formError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Nom du client *
          <input
            name="customerName"
            value={values.customerName}
            onChange={(event) => update('customerName', event.target.value)}
            aria-invalid={Boolean(errors.customerName)}
            className={inputClass(Boolean(errors.customerName))}
          />
          {fieldError('customerName')}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Téléphone du client *
          <input
            name="customerPhone"
            type="tel"
            value={values.customerPhone}
            placeholder="+32 470 12 34 56"
            onChange={(event) => update('customerPhone', event.target.value)}
            aria-invalid={Boolean(errors.customerPhone)}
            className={inputClass(Boolean(errors.customerPhone))}
          />
          {fieldError('customerPhone')}
        </label>
      </div>

      <AddressAutocomplete
        label="Adresse de livraison"
        name="deliveryAddress"
        required
        value={values.deliveryAddress}
        hasCoordinates={values.deliveryLatitude !== null}
        error={errors.deliveryAddress}
        onChange={(text) => {
          setValues((current) => ({ ...current, deliveryAddress: text, deliveryLatitude: null, deliveryLongitude: null }));
          setErrors((current) => ({ ...current, deliveryAddress: undefined }));
        }}
        onSelect={(result) => {
          setValues((current) => ({
            ...current,
            deliveryAddress: result.label,
            deliveryLatitude: result.latitude,
            deliveryLongitude: result.longitude,
          }));
          setErrors((current) => ({ ...current, deliveryAddress: undefined }));
        }}
      />

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
        Instructions pour le chauffeur
        <textarea
          name="notes"
          rows={2}
          value={values.notes}
          placeholder="Code porte, étage, sonner 2x…"
          onChange={(event) => update('notes', event.target.value)}
          className={inputClass(Boolean(errors.notes))}
        />
        {fieldError('notes')}
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Référence commande
          <input
            name="orderReference"
            value={values.orderReference}
            placeholder="CMD-1001"
            onChange={(event) => update('orderReference', event.target.value)}
            className={inputClass(Boolean(errors.orderReference))}
          />
          {fieldError('orderReference')}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Montant de la commande (€)
          <input
            name="orderAmount"
            inputMode="decimal"
            value={values.orderAmount}
            placeholder="31,50"
            onChange={(event) => update('orderAmount', event.target.value)}
            aria-invalid={Boolean(errors.orderAmount)}
            className={inputClass(Boolean(errors.orderAmount))}
          />
          {fieldError('orderAmount')}
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-600">Paiement *</legend>
        <div className="flex flex-wrap gap-3">
          {([
            ['PREPAID', 'Prépayée'],
            ['CASH_ON_DELIVERY', 'Paiement à la livraison (cash)'],
          ] as const).map(([mode, label]) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm ${values.paymentMode === mode ? 'border-black bg-black text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
            >
              <input
                type="radio"
                name="paymentMode"
                value={mode}
                checked={values.paymentMode === mode}
                onChange={() => selectPaymentMode(mode)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {fieldError('paymentMode')}
      </fieldset>

      {values.paymentMode === 'CASH_ON_DELIVERY' ? (
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Montant à encaisser par le chauffeur (€) *
          <input
            name="cashToCollect"
            inputMode="decimal"
            value={values.cashToCollect}
            placeholder="34,00"
            onChange={(event) => update('cashToCollect', event.target.value)}
            aria-invalid={Boolean(errors.cashToCollect)}
            className={inputClass(Boolean(errors.cashToCollect))}
          />
          {fieldError('cashToCollect')}
        </label>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
      >
        {isSubmitting ? 'Création…' : 'Créer la livraison'}
      </button>
    </form>
  );
}
