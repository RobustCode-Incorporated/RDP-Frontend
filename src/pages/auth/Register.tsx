import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axios';
import { parseApiError } from '../../api/errors';
import type { RegisterDriverRequest, User } from '../../api/types';
import { PHONE_REGEX } from '../../lib/format';

type Values = Omit<RegisterDriverRequest, 'role'>;
type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phoneNumber: '',
  vehicleType: '',
  vehiclePlate: '',
};

const VEHICLE_TYPES = [
  { value: 'BIKE', label: 'Vélo' },
  { value: 'SCOOTER', label: 'Scooter' },
  { value: 'MOTORBIKE', label: 'Moto' },
  { value: 'CAR', label: 'Voiture' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values: Values): Errors => {
  const errors: Errors = {};
  (Object.keys(EMPTY) as Array<keyof Values>).forEach((key) => {
    if (!values[key].trim()) errors[key] = 'Champ obligatoire.';
  });
  if (values.email && !EMAIL_REGEX.test(values.email.trim())) errors.email = 'Email invalide.';
  if (values.password && values.password.length < 8) errors.password = '8 caractères minimum.';
  if (values.phoneNumber && !PHONE_REGEX.test(values.phoneNumber.trim())) {
    errors.phoneNumber = 'Numéro invalide (ex. +32 470 12 34 56).';
  }
  return errors;
};

const inputClass = (hasError: boolean) =>
  `w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${hasError ? 'border-red-400' : 'border-gray-300'}`;

/**
 * Public signup is for DRIVERS only (contract 2.2). Restaurants are onboarded by the
 * platform admin. New driver accounts are disabled until an admin validates them.
 */
export const Register = () => {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');

  const update = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    try {
      const request: RegisterDriverRequest = {
        email: values.email.trim(),
        password: values.password,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phoneNumber: values.phoneNumber.trim(),
        vehicleType: values.vehicleType,
        vehiclePlate: values.vehiclePlate.trim().toUpperCase(),
        role: 'DRIVER',
      };
      const { data } = await api.post<User>('/api/auth/register', request);
      setCreatedEmail(data?.email ?? request.email);
    } catch (err) {
      const parsed = parseApiError(err, 'Inscription impossible pour le moment.');
      setErrors(parsed.fieldErrors as Errors);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof Values, label: string, type = 'text', className = '') => (
    <div className={className}>
      <label htmlFor={`register-${key}`} className="font-semibold mb-1 text-[#333] block">{label}</label>
      <input
        id={`register-${key}`}
        type={type}
        value={values[key]}
        onChange={(event) => update(key, event.target.value)}
        aria-invalid={Boolean(errors[key])}
        className={inputClass(Boolean(errors[key]))}
      />
      {errors[key] ? <p className="mt-1 text-xs text-red-600">{errors[key]}</p> : null}
    </div>
  );

  if (createdEmail) {
    return (
      <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center px-4 py-8">
        <div role="status" className="w-full max-w-[520px] rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8 text-center">
          <h1 className="text-[22px] font-bold text-black mb-3">Compte créé — en attente de validation par l’administrateur</h1>
          <p className="text-sm text-gray-600">
            Votre compte chauffeur <strong>{createdEmail}</strong> a bien été enregistré. Vous pourrez vous connecter
            dès qu’un administrateur l’aura validé.
          </p>
          <Link to="/login" className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-bold text-white hover:bg-gray-800">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[620px] rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <h1 className="text-[24px] font-bold text-black mb-2">Devenir chauffeur</h1>
        <p className="text-sm text-gray-600 mb-6">
          ROBUST DELIVERY PLATFORM (RDP) — inscription réservée aux chauffeurs. Vous êtes un restaurant ? Contactez-nous,
          votre compte est créé par notre équipe.
        </p>

        {error ? <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div> : null}

        <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="Inscription chauffeur">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('firstName', 'Prénom')}
            {field('lastName', 'Nom')}
            {field('email', 'Email', 'email', 'md:col-span-2')}
            {field('password', 'Mot de passe (8 caractères min.)', 'password', 'md:col-span-2')}
            {field('phoneNumber', 'Téléphone', 'tel')}
            <div>
              <label htmlFor="register-vehicleType" className="font-semibold mb-1 text-[#333] block">Type de véhicule</label>
              <select
                id="register-vehicleType"
                value={values.vehicleType}
                onChange={(event) => update('vehicleType', event.target.value)}
                aria-invalid={Boolean(errors.vehicleType)}
                className={inputClass(Boolean(errors.vehicleType))}
              >
                <option value="">Choisir…</option>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.vehicleType ? <p className="mt-1 text-xs text-red-600">{errors.vehicleType}</p> : null}
            </div>
            {field('vehiclePlate', 'Plaque du véhicule', 'text', 'md:col-span-2')}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Inscription en cours...' : 'CRÉER MON COMPTE CHAUFFEUR'}
          </button>
        </form>

        <p className="mt-5 text-center text-gray-500">
          Déjà inscrit ?{' '}
          <Link to="/login" className="text-black font-bold underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};
