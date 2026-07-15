import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'rdp-auth';

const getStoredAuth = (): Pick<AuthState, 'user' | 'token'> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { user: null, token: null };
  }

  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedValue) {
    return { user: null, token: null };
  }

  try {
    return JSON.parse(storedValue) as Pick<AuthState, 'user' | 'token'>;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, token: null };
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getStoredAuth(),
  setAuth: (user, token) => {
    const nextState = { user, token };
    if (window.localStorage) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    }
    set(nextState);
  },
  logout: () => {
    if (window.localStorage) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    set({ user: null, token: null });
  },
}));
