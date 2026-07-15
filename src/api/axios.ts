
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:8080'
  : 'https://rdp-backend-xr8r.onrender.com';
const apiBaseUrl = rawApiBaseUrl && rawApiBaseUrl.trim().length > 0
  ? rawApiBaseUrl.trim()
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