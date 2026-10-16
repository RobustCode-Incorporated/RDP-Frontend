import { createContext, useContext } from 'react';

export type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const noop = () => {};

export const ToastContext = createContext<ToastApi>({
  success: noop,
  error: noop,
  info: noop,
});

export function useToast() {
  return useContext(ToastContext);
}
