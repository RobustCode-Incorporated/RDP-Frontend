import { useState, type FormEvent } from 'react';
import { fetchRestaurants, registerRestaurant, updateRestaurant } from '../../api/adminApi';
import { parseApiError } from '../../api/errors';
import type { RegisterRestaurantRequest, Restaurant } from '../../api/types';
import { useToast } from '../../components/feedback/toastContext';
import { AddressAutocomplete } from '../../components/shared/AddressAutocomplete';

type Values = Required<{ [K in keyof RegisterRestaurantRequest]: string }>;

const EMPTY: Values = {
  restaurantName: '',
  description: '',
  phoneNumber: '',
  restaurantEmail: '',
  address: '',
  city: '',
  country: 'BE',
  adminEmail: '',
  adminPassword: '',
  adminFirstName: '',
  adminLastName: '',
};

const REQUIRED: Array<keyof Values> = [
  'restaurantName', 'phoneNumber', 'restaurantEmail', 'address',
  'adminEmail', 'adminPassword', 'adminFirstName', 'adminLastName',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateRestaurantFormProps {
  onCreated: (restaurant: Restaurant | null) => void;
}

/**
 * POST /api/auth/register-restaurant (ADMIN). The response is the manager `User`, not the
 * restaurant, so coordinates picked from the address autocomplete are saved afterwards with
 * PATCH /api/restaurants/{id}, after finding the new restaurant by its email.
 */
export function CreateRestaurantForm({ onCreated }: CreateRestaurantFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<Values>(EMPTY);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Values, string>> = {};
    REQUIRED.forEach((key) => {
      if (!values[key].trim()) next[key] = 'Champ obligatoire.';
    });
    if (values.restaurantEmail && !EMAIL_REGEX.test(values.restaurantEmail.trim())) next.restaurantEmail = 'Email invalide.';
    if (values.adminEmail && !EMAIL_REGEX.test(values.adminEmail.trim())) next.adminEmail = 'Email invalide.';
    if (values.adminPassword && values.adminPassword.length < 8) next.adminPassword = '8 caractères minimum.';
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    const optional = (value: string) => (value.trim() ? value.trim() : null);
    try {
      await registerRestaurant({
        restaurantName: values.restaurantName.trim(),
        description: optional(values.description),
        phoneNumber: values.phoneNumber.trim(),
        restaurantEmail: values.restaurantEmail.trim(),
        address: values.address.trim(),
        city: optional(values.city),
        country: optional(values.country),
        adminEmail: values.adminEmail.trim(),
        adminPassword: values.adminPassword,
        adminFirstName: values.adminFirstName.trim(),
        adminLastName: values.adminLastName.trim(),
      });

      let created: Restaurant | null = null;
      try {
        const restaurants = await fetchRestaurants();
        const email = values.restaurantEmail.trim().toLowerCase();
        created = restaurants.find((restaurant) => restaurant.email?.toLowerCase() === email) ?? null;
        if (created && coordinates) {
          created = await updateRestaurant(created.id, coordinates);
        }
      } catch {
        toast.info('Restaurant créé, mais la localisation n’a pas pu être enregistrée. Modifiez-la depuis la liste.');
      }

      toast.success(`Restaurant créé. Le gérant peut se connecter avec ${values.adminEmail.trim()}.`);
      setValues(EMPTY);
      setCoordinates(null);
      onCreated(created);
    } catch (error) {
      const parsed = parseApiError(error, 'Création du restaurant impossible.');
      setErrors(parsed.fieldErrors as Partial<Record<keyof Values, string>>);
      setFormError(parsed.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const input = (key: keyof Values, label: string, type = 'text', required = REQUIRED.includes(key)) => (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
      {label}{required ? ' *' : ''}
      <input
        name={key}
        type={type}
        value={values[key]}
        onChange={(event) => update(key, event.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={`rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-black ${errors[key] ? 'border-rose-400' : 'border-slate-200'}`}
      />
      {errors[key] ? <span className="text-xs text-rose-600">{errors[key]}</span> : null}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Nouveau restaurant" className="space-y-4">
      {formError ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{formError}</div> : null}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Restaurant</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('restaurantName', 'Nom du restaurant')}
        {input('phoneNumber', 'Téléphone', 'tel')}
        {input('restaurantEmail', 'Email du restaurant', 'email')}
        {input('description', 'Description')}
      </div>
      <AddressAutocomplete
        label="Adresse"
        required
        value={values.address}
        hasCoordinates={coordinates !== null}
        error={errors.address}
        onChange={(text) => {
          update('address', text);
          setCoordinates(null);
        }}
        onSelect={(result) => {
          update('address', result.label);
          setCoordinates({ latitude: result.latitude, longitude: result.longitude });
        }}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('city', 'Ville')}
        {input('country', 'Pays')}
      </div>
      <p className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Compte du gérant</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('adminFirstName', 'Prénom')}
        {input('adminLastName', 'Nom')}
        {input('adminEmail', 'Email de connexion', 'email')}
        {input('adminPassword', 'Mot de passe initial', 'password')}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {isSubmitting ? 'Création…' : 'Créer le restaurant'}
      </button>
    </form>
  );
}
