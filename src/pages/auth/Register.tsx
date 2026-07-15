import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';

type RegistrationRole = 'DRIVER' | 'RESTAURANT';

export const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<RegistrationRole>('DRIVER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [driverFirstName, setDriverFirstName] = useState('');
  const [driverLastName, setDriverLastName] = useState('');
  const [driverPhoneNumber, setDriverPhoneNumber] = useState('');
  const [driverVehicleType, setDriverVehicleType] = useState('');
  const [driverVehiclePlate, setDriverVehiclePlate] = useState('');

  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantDescription, setRestaurantDescription] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [restaurantEmail, setRestaurantEmail] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [restaurantCity, setRestaurantCity] = useState('');
  const [restaurantCountry, setRestaurantCountry] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');

  const extractErrorMessage = (err: unknown): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const response = (err as { response?: { data?: unknown } }).response;
      const data = response?.data;
      if (typeof data === 'string' && data.trim()) {
        return data;
      }
      if (typeof data === 'object' && data !== null && 'message' in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }
    return 'Inscription impossible pour le moment.';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (role === 'DRIVER') {
        await api.post('/api/auth/register', {
          email: driverEmail,
          password: driverPassword,
          firstName: driverFirstName,
          lastName: driverLastName,
          phoneNumber: driverPhoneNumber,
          vehicleType: driverVehicleType,
          vehiclePlate: driverVehiclePlate,
          role: 'DRIVER',
        });
      } else {
        await api.post('/api/auth/register-restaurant', {
          restaurantName,
          description: restaurantDescription || null,
          phoneNumber: restaurantPhone,
          restaurantEmail,
          address: restaurantAddress,
          city: restaurantCity || null,
          country: restaurantCountry || null,
          adminEmail,
          adminPassword,
          adminFirstName,
          adminLastName,
        });
      }

      setSuccess('Compte cree avec succes. Vous pouvez maintenant vous connecter.');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { registrationSuccess: true },
        });
      }, 900);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFAFA] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[620px] rounded-2xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
        <h1 className="text-[24px] font-bold text-black mb-2">Créer un compte</h1>
        <p className="text-sm text-gray-600 mb-6">ROBUST DELIVERY PLATFORM (RDP)</p>

        {error ? <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div> : null}
        {success ? <div className="mb-4 p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm">{success}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="font-semibold mb-1 text-[#333] block">Rôle du compte</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RegistrationRole)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="DRIVER">Driver</option>
              <option value="RESTAURANT">Restaurant</option>
            </select>
          </div>

          {role === 'DRIVER' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold mb-1 text-[#333] block">Prénom</label>
                <input
                  type="text"
                  value={driverFirstName}
                  onChange={(e) => setDriverFirstName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="font-semibold mb-1 text-[#333] block">Nom</label>
                <input
                  type="text"
                  value={driverLastName}
                  onChange={(e) => setDriverLastName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold mb-1 text-[#333] block">Email</label>
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold mb-1 text-[#333] block">Mot de passe</label>
                <input
                  type="password"
                  value={driverPassword}
                  onChange={(e) => setDriverPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="font-semibold mb-1 text-[#333] block">Téléphone</label>
                <input
                  type="text"
                  value={driverPhoneNumber}
                  onChange={(e) => setDriverPhoneNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div>
                <label className="font-semibold mb-1 text-[#333] block">Type de véhicule</label>
                <input
                  type="text"
                  value={driverVehicleType}
                  onChange={(e) => setDriverVehicleType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-semibold mb-1 text-[#333] block">Plaque du véhicule</label>
                <input
                  type="text"
                  value={driverVehiclePlate}
                  onChange={(e) => setDriverVehiclePlate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="font-semibold mb-1 text-[#333] block">Nom du restaurant</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold mb-1 text-[#333] block">Description (optionnelle)</label>
                  <textarea
                    value={restaurantDescription}
                    onChange={(e) => setRestaurantDescription(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="font-semibold mb-1 text-[#333] block">Téléphone</label>
                  <input
                    type="text"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold mb-1 text-[#333] block">Email restaurant</label>
                  <input
                    type="email"
                    value={restaurantEmail}
                    onChange={(e) => setRestaurantEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-semibold mb-1 text-[#333] block">Adresse</label>
                  <input
                    type="text"
                    value={restaurantAddress}
                    onChange={(e) => setRestaurantAddress(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold mb-1 text-[#333] block">Ville (optionnelle)</label>
                  <input
                    type="text"
                    value={restaurantCity}
                    onChange={(e) => setRestaurantCity(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="font-semibold mb-1 text-[#333] block">Pays (optionnel)</label>
                  <input
                    type="text"
                    value={restaurantCountry}
                    onChange={(e) => setRestaurantCountry(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-1">
                <p className="font-bold text-black mb-3">Administrateur du restaurant</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold mb-1 text-[#333] block">Prénom admin</label>
                    <input
                      type="text"
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold mb-1 text-[#333] block">Nom admin</label>
                    <input
                      type="text"
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-semibold mb-1 text-[#333] block">Email admin</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-semibold mb-1 text-[#333] block">Mot de passe admin</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Inscription en cours...' : 'CRÉER LE COMPTE'}
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
