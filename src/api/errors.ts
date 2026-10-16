import axios from 'axios';
import type { ApiError } from './types';

export interface ParsedApiError {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  /** Message safe to show to the user (server message or French fallback). */
  message: string;
  /** Per-field validation messages, keyed by request field name. Empty when none. */
  fieldErrors: Record<string, string>;
}

const isApiErrorBody = (value: unknown): value is Partial<ApiError> =>
  typeof value === 'object' && value !== null && ('message' in value || 'fieldErrors' in value);

// The backend returns English messages (contract 1.1). Translate the known ones so the
// French UI stays consistent; unknown messages are shown as-is.
const KNOWN_MESSAGES: Array<[RegExp, string]> = [
  [/^Validation failed$/, 'Certains champs sont invalides.'],
  [/^Invalid email or password$/, 'Identifiants incorrects.'],
  [/^Account is disabled or pending administrator approval$/, 'Votre compte est en attente de validation par l’administrateur (ou a été désactivé).'],
  [/^Authentication required$/, 'Session expirée, veuillez vous reconnecter.'],
  [/^Access denied$/, 'Accès refusé.'],
  [/^Email already exists$/, 'Cet email est déjà utilisé.'],
  [/^Admin email already exists$/, 'L’email du gérant est déjà utilisé.'],
  [/^Restaurant email already exists$/, 'L’email du restaurant est déjà utilisé.'],
  [/^Vehicle plate already exists$/, 'Cette plaque est déjà enregistrée.'],
  [/^Delivery not found$/, 'Livraison introuvable.'],
  [/^Driver not found$/, 'Chauffeur introuvable.'],
  [/^Restaurant not found$/, 'Restaurant introuvable.'],
  [/^Restaurant is inactive$/, 'Le restaurant est inactif.'],
  [/^No restaurant is linked to your account$/, 'Aucun restaurant n’est lié à votre compte.'],
  [/^No restaurant assigned to user$/, 'Aucun restaurant n’est lié à votre compte.'],
  [/^No driver profile assigned to user$/, 'Aucun profil chauffeur n’est lié à votre compte.'],
  [/^Driver account is disabled$/, 'Le compte du chauffeur est désactivé.'],
  [/^Driver is not available\. Current availability: (\w+)$/, 'Le chauffeur n’est plus disponible ($1). Choisissez-en un autre.'],
  [/^Driver not assigned to this delivery$/, 'Cette livraison ne vous est plus assignée.'],
  [/^You do not have access to this delivery$/, 'Vous n’avez pas accès à cette livraison.'],
  [/^You cannot disable your own account$/, 'Vous ne pouvez pas désactiver votre propre compte.'],
  [/^Cannot change delivery status from (\w+) to (\w+)$/, 'Transition impossible ($1 → $2). La livraison a peut-être changé, rechargez.'],
  [/^Food can only be marked ready before pickup/, 'La commande ne peut être marquée prête qu’avant le retrait.'],
  [/^A driver can only be assigned while the delivery is CREATED or ASSIGNED/, 'Un chauffeur ne peut être assigné qu’avant le retrait.'],
  [/^Public registration is only allowed/, 'L’inscription publique est réservée aux chauffeurs.'],
  [/^An unexpected error occurred$/, 'Erreur serveur inattendue, réessayez plus tard.'],
];

const FIELD_MESSAGES: Array<[RegExp, string]> = [
  [/^Customer name is required/, 'Le nom du client est obligatoire.'],
  [/^Customer phone must be a valid phone number/, 'Numéro invalide (8 à 15 chiffres, ex. +32 470 12 34 56).'],
  [/^Delivery address is required/, 'L’adresse de livraison est obligatoire.'],
  [/^Payment mode is required/, 'Choisissez un mode de paiement.'],
  [/^Cash to collect is required and must be greater than 0/, 'Montant à encaisser obligatoire (> 0) pour un paiement à la livraison.'],
  [/^Cash to collect must be empty for PREPAID/, 'Pas de montant à encaisser pour une commande prépayée.'],
  [/must be provided together/, 'Latitude et longitude doivent être fournies ensemble.'],
  [/^Driver id is required/, 'Choisissez un chauffeur.'],
];

export function translateApiMessage(message: string, table: Array<[RegExp, string]> = KNOWN_MESSAGES): string {
  for (const [pattern, replacement] of table) {
    if (pattern.test(message)) {
      return message.replace(pattern, replacement);
    }
  }
  return message;
}

const translateFieldErrors = (fieldErrors: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(fieldErrors).map(([field, message]) => [field, translateApiMessage(String(message), FIELD_MESSAGES)])
  );

const STATUS_FALLBACKS: Record<number, string> = {
  400: 'Requête invalide.',
  401: 'Session expirée, veuillez vous reconnecter.',
  403: 'Accès refusé.',
  404: 'Ressource introuvable.',
  409: 'Conflit : les données ont changé, rechargez puis réessayez.',
  500: 'Erreur serveur inattendue, réessayez plus tard.',
};

/**
 * Extracts the contract error body `{status,error,message,timestamp,path,fieldErrors}`
 * from any thrown value (axios error, Error, unknown).
 */
export function parseApiError(error: unknown, fallback = 'Une erreur est survenue.'): ParsedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data: unknown = error.response?.data;

    if (!error.response) {
      return {
        status: 0,
        message: 'Serveur injoignable. Vérifiez votre connexion (le serveur peut mettre jusqu’à une minute à démarrer).',
        fieldErrors: {},
      };
    }

    if (isApiErrorBody(data)) {
      const message = typeof data.message === 'string' && data.message.trim() ? data.message : null;
      return {
        status,
        message: message ? translateApiMessage(message) : STATUS_FALLBACKS[status] ?? fallback,
        fieldErrors: data.fieldErrors && typeof data.fieldErrors === 'object' ? translateFieldErrors(data.fieldErrors) : {},
      };
    }

    if (typeof data === 'string' && data.trim()) {
      return { status, message: data, fieldErrors: {} };
    }

    return { status, message: STATUS_FALLBACKS[status] ?? fallback, fieldErrors: {} };
  }

  return { status: 0, message: fallback, fieldErrors: {} };
}

/** Shortcut for toasts: the user-facing message of an error. */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  return parseApiError(error, fallback).message;
}
