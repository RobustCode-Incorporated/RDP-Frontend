import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { api } from '../../api/axios';
import { parseApiError } from '../../api/errors';
import type { LoginResponse } from '../../api/types';
import { useAuthStore } from '../../store/useAuthStore';
import { homePathForRole } from '../../routes/homePath';
import logoImage from '../../assets/RobustCodelogowhite.png';

export const Login = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const registrationSuccess = Boolean((location.state as { registrationSuccess?: boolean } | null)?.registrationSuccess);
  
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    navigate(homePathForRole(user.role), { replace: true });
  }, [navigate, token, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
      let decoded: { role?: string; id?: number } = {};
      try {
        decoded = jwtDecode<{ role?: string; id?: number }>(data.token);
      } catch {
        // The role is also returned in the body (contract 2.1).
      }
      const role = data.role ?? decoded.role ?? 'RESTAURANT';
      setAuth({ id: decoded.id ?? 0, email: data.email ?? email, role }, data.token);
      navigate(homePathForRole(role));
    } catch (err) {
      const parsed = parseApiError(err, 'Connexion impossible pour le moment.');
      if (parsed.status === 401) {
        setError('Identifiants incorrects.');
      } else if (parsed.status === 403) {
        setError('Votre compte est en attente de validation par l’administrateur (ou a été désactivé). Vous pourrez vous connecter dès sa validation.');
      } else {
        setError(parsed.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans">
      {/* Left Panel */}
      <div className="hidden w-[40%] bg-black lg:flex flex-col items-center justify-center p-[10%] box-border">
        <div className="flex flex-col items-center text-center w-full">
          <img src={logoImage} alt="Logo REM" className="w-full max-w-[320px] h-auto mb-6" />
          <h1 className="text-[min(1.8vw,30px)] text-[#FFFAFA] tracking-[2px] font-light whitespace-nowrap">
            ROBUST DELIVERY PLATFORM
          </h1>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-[#FFFAFA] flex items-center justify-center p-5">
        <div className="w-full max-w-[400px]">
          <h1 className="text-[22px] font-bold mb-3 text-black">Connexion</h1>
          <p className="mb-6 text-sm text-gray-500">
            Accédez à votre espace selon votre rôle et reprenez là où vous vous êtes arrêté.
          </p>

          {registrationSuccess ? (
            <div className="mb-4 p-3 bg-emerald-100 text-emerald-700 rounded-lg text-sm">
              Compte créé. Vous pourrez vous connecter dès sa validation par l’administrateur.
            </div>
          ) : null}

          {error && <div role="alert" className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleLogin} className="flex flex-col">
            <label htmlFor="login-email" className="font-semibold mb-1 text-[#333]">Identifiant</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patron@entreprise.com"
              className="w-full p-3 mb-5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              required
            />

            <label htmlFor="login-password" className="font-semibold mb-1 text-[#333]">Mot de passe</label>
            <div className="relative w-full mb-6">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
              >
                {showPassword ? (
                  /* Œil barré (masquer) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 1-4.243-4.243m4.243 4.243L9.35 9.35" />
                  </svg>
                ) : (
                  /* Œil normal (afficher) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white p-4 rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Connexion en cours...' : 'SE CONNECTER'}
            </button>
          </form>

          <p className="mt-5 text-center text-gray-500">
            Chauffeur sans compte ?{' '}
            <Link to="/register" className="text-black font-bold underline">
              S’inscrire comme chauffeur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};