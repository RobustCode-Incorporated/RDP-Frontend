export const PILOT_TIME_ZONE = 'Europe/Brussels';

const moneyFormatter = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });

/** Formats an EUR amount (`31.5` -> `31,50 €`). Returns `—` for null/undefined/NaN. */
export const formatMoney = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const amount = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(amount) ? moneyFormatter.format(amount) : '—';
};

const dateTimeFormatter = new Intl.DateTimeFormat('fr-BE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: PILOT_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat('fr-BE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PILOT_TIME_ZONE,
});

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTimeFormatter.format(new Date(value)) : '—';

export const formatTime = (value: string | null | undefined) =>
  value ? timeFormatter.format(new Date(value)) : '—';

/** Today's date in Brussels as `YYYY-MM-DD` (the format `GET /api/deliveries?from=&to=` expects). */
export const todayInBrussels = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: PILOT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/** Minutes elapsed since an ISO instant. */
export const minutesSince = (value: string, now: number = Date.now()) =>
  Math.max(0, Math.floor((now - Date.parse(value)) / 60000));

export const formatElapsed = (value: string, now: number = Date.now()) => {
  const minutes = minutesSince(value, now);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours} h ${String(minutes % 60).padStart(2, '0')}`;
};

export const personName = (firstName?: string | null, lastName?: string | null, fallback = '—') =>
  `${firstName ?? ''} ${lastName ?? ''}`.trim() || fallback;

/** Phone regex from contract 9.3 (8-15 digits, optional leading +, common separators). */
export const PHONE_REGEX = /^\+?(?:[\s./()-]*\d){8,15}[\s./()-]*$/;

/** Parses a French/English decimal input (`12,50` or `12.50`). Returns null when empty, NaN when invalid. */
export const parseAmount = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
};
