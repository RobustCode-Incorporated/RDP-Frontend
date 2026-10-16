import type { CreateDeliveryRequest, PaymentMode } from '../../api/types';
import { PHONE_REGEX, parseAmount } from '../../lib/format';

export interface DeliveryFormValues {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  notes: string;
  orderReference: string;
  orderAmount: string;
  paymentMode: PaymentMode | '';
  cashToCollect: string;
}

export const EMPTY_DELIVERY_FORM: DeliveryFormValues = {
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  deliveryLatitude: null,
  deliveryLongitude: null,
  notes: '',
  orderReference: '',
  orderAmount: '',
  paymentMode: '',
  cashToCollect: '',
};

export type DeliveryFieldErrors = Partial<Record<string, string>>;

/** Client-side mirror of contract 4.5 / 9.3 rules. Returns `{}` when valid. */
export function validateDeliveryForm(values: DeliveryFormValues): DeliveryFieldErrors {
  const errors: DeliveryFieldErrors = {};
  const name = values.customerName.trim();
  if (!name) errors.customerName = 'Le nom du client est obligatoire.';
  else if (name.length > 150) errors.customerName = '150 caractères maximum.';

  const phone = values.customerPhone.trim();
  if (!phone) errors.customerPhone = 'Le téléphone du client est obligatoire.';
  else if (!PHONE_REGEX.test(phone)) errors.customerPhone = 'Numéro invalide (8 à 15 chiffres, ex. +32 470 12 34 56).';

  const address = values.deliveryAddress.trim();
  if (!address) errors.deliveryAddress = 'L’adresse de livraison est obligatoire.';
  else if (address.length > 255) errors.deliveryAddress = '255 caractères maximum.';

  if (values.notes.trim().length > 500) errors.notes = '500 caractères maximum.';
  if (values.orderReference.trim().length > 100) errors.orderReference = '100 caractères maximum.';

  const orderAmount = parseAmount(values.orderAmount);
  if (orderAmount !== null && Number.isNaN(orderAmount)) errors.orderAmount = 'Montant invalide (ex. 31,50).';

  if (!values.paymentMode) {
    errors.paymentMode = 'Choisissez un mode de paiement.';
  } else if (values.paymentMode === 'CASH_ON_DELIVERY') {
    const cash = parseAmount(values.cashToCollect);
    if (cash === null || Number.isNaN(cash) || cash <= 0) {
      errors.cashToCollect = 'Montant à encaisser obligatoire (> 0) pour un paiement à la livraison.';
    }
  }
  return errors;
}

export function toCreateDeliveryRequest(values: DeliveryFormValues): CreateDeliveryRequest {
  const optional = (value: string) => (value.trim() ? value.trim() : null);
  const hasCoordinates = values.deliveryLatitude !== null && values.deliveryLongitude !== null;
  return {
    customerName: values.customerName.trim(),
    customerPhone: values.customerPhone.trim(),
    deliveryAddress: values.deliveryAddress.trim(),
    deliveryLatitude: hasCoordinates ? values.deliveryLatitude : null,
    deliveryLongitude: hasCoordinates ? values.deliveryLongitude : null,
    notes: optional(values.notes),
    orderReference: optional(values.orderReference),
    orderAmount: parseAmount(values.orderAmount),
    paymentMode: values.paymentMode as PaymentMode,
    cashToCollect: values.paymentMode === 'CASH_ON_DELIVERY' ? parseAmount(values.cashToCollect) : null,
  };
}

