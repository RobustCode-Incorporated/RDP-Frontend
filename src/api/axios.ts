
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const normalizedApiBaseUrl = rawApiBaseUrl?.trim();
const fallbackApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:8080'
  : 'https://rdp-backend-xr8r.onrender.com';
const apiBaseUrl = normalizedApiBaseUrl && normalizedApiBaseUrl.length > 0 && (import.meta.env.DEV || !normalizedApiBaseUrl.startsWith('/'))
  ? normalizedApiBaseUrl
  : fallbackApiBaseUrl;

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour injecter le token JWT automatiquement
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const LOGIN_PATH = '/login';

const isAuthEndpoint = (url?: string) => Boolean(url && url.includes('/api/auth/'));

// On 401 (expired/revoked token), clear the session and send the user back to /login.
// Login/register calls are excluded so a wrong password still shows its own error.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthEndpoint(error.config?.url)) {
      const hadSession = Boolean(useAuthStore.getState().token);
      useAuthStore.getState().logout();
      if (hadSession && typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
        window.location.assign(LOGIN_PATH);
      }
    }
    return Promise.reject(error);
  }
);
