import { useState } from 'react';
import { updateRestaurant } from '../../api/adminApi';
import { getApiErrorMessage } from '../../api/errors';
import type { Restaurant } from '../../api/types';
import { useToast } from '../../components/feedback/toastContext';
import { AddressAutocomplete } from '../../components/shared/AddressAutocomplete';
import { geocodeAddress } from '../../lib/nominatim';
import { CreateRestaurantForm } from './CreateRestaurantForm';

interface RestaurantsViewProps {
  restaurants: Restaurant[];
  onChanged: () => void;
}

const formatCoordinates = (restaurant: Restaurant) =>
  restaurant.latitude !== null && restaurant.longitude !== null
    ? `${restaurant.latitude.toFixed(5)}, ${restaurant.longitude.toFixed(5)}`
    : null;

function LocationEditor({ restaurant, onSaved, onCancel }: { restaurant: Restaurant; onSaved: (r: Restaurant) => void; onCancel: () => void }) {
  const toast = useToast();
  const [address, setAddress] = useState(restaurant.address);
  const [latitude, setLatitude] = useState(restaurant.latitude !== null ? String(restaurant.latitude) : '');
  const [longitude, setLongitude] = useState(restaurant.longitude !== null ? String(restaurant.longitude) : '');
  const [picked, setPicked] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const handleGeocode = async () => {
    setIsBusy(true);
    setError('');
    try {
      const query = [address, restaurant.city, 'Belgique'].filter(Boolean).join(', ');
      const result = await geocodeAddress(query);
      if (!result) {
        setError('Adresse introuvable. Choisissez une suggestion ou saisissez les coordonnées.');
        return;
      }
      setLatitude(result.latitude.toFixed(7));
      setLongitude(result.longitude.toFixed(7));
    } catch {
      setError('Géocodage indisponible pour le moment.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async () => {
    const lat = Number(latitude.replace(',', '.'));
    const lng = Number(longitude.replace(',', '.'));
    if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError('Latitude (-90..90) et longitude (-180..180) sont obligatoires.');
      return;
    }
    setIsBusy(true);
    setError('');
    try {
      const patch: Parameters<typeof updateRestaurant>[1] = { latitude: lat, longitude: lng };
      if (address.trim() && address.trim() !== restaurant.address && !picked) patch.address = address.trim();
      const updated = await updateRestaurant(restaurant.id, patch);
      toast.success(`Localisation de ${restaurant.name} enregistrée.`);
      onSaved(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Enregistrement impossible.'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <AddressAutocomplete
        label="Rechercher l’adresse"
        value={address}
        hasCoordinates={picked}
        onChange={(text) => {
          setAddress(text);
          setPicked(false);
        }}
        onSelect={(result) => {
          setAddress(result.label);
          setPicked(true);
          setLatitude(result.latitude.toFixed(7));
          setLongitude(result.longitude.toFixed(7));
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Latitude
          <input value={latitude} onChange={(event) => setLatitude(event.target.value)} inputMode="decimal" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
          Longitude
          <input value={longitude} onChange={(event) => setLongitude(event.target.value)} inputMode="decimal" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2" />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={isBusy} onClick={() => void handleGeocode()} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:border-black disabled:opacity-50">
          Géocoder l’adresse
        </button>
        <button type="button" disabled={isBusy} onClick={() => void handleSave()} className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Enregistrer la localisation
        </button>
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 hover:text-black">
          Fermer
        </button>
      </div>
      <p className="text-xs text-slate-400">Les coordonnées deviennent le point de retrait par défaut des nouvelles livraisons.</p>
    </div>
  );
}

export function RestaurantsView({ restaurants, onChanged }: RestaurantsViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Nouveau restaurant partenaire</h3>
            <p className="text-sm text-slate-500">Crée le restaurant et le compte de connexion de son gérant.</p>
          </div>
          <button
            type="button"
            aria-expanded={showCreate}
            onClick={() => setShowCreate((value) => !value)}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-black hover:text-black"
          >
            {showCreate ? 'Masquer' : 'Ajouter un restaurant'}
          </button>
        </div>
        {showCreate ? (
          <CreateRestaurantForm
            onCreated={() => {
              setShowCreate(false);
              onChanged();
            }}
          />
        ) : null}
      </section>

      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Restaurants</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{restaurants.length}</span>
        </div>
        {restaurants.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Aucun restaurant pour le moment.</p>
        ) : null}
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {restaurants.map((restaurant) => {
            const coordinates = formatCoordinates(restaurant);
            return (
              <li key={restaurant.id} aria-label={`Restaurant ${restaurant.name}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{restaurant.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{[restaurant.address, restaurant.city].filter(Boolean).join(', ')}</p>
                    <p className="mt-1 text-xs text-slate-400">{[restaurant.phoneNumber, restaurant.email].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${restaurant.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {restaurant.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  {coordinates ? (
                    <span className="text-slate-500">Coordonnées : {coordinates}</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Non localisé sur la carte</span>
                  )}
                  {editingId !== restaurant.id ? (
                    <button
                      type="button"
                      onClick={() => setEditingId(restaurant.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 hover:border-black"
                    >
                      Modifier la localisation
                    </button>
                  ) : null}
                </div>
                {editingId === restaurant.id ? (
                  <LocationEditor
                    restaurant={restaurant}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      onChanged();
                    }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
