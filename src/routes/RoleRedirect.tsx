import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function RoleRedirect() {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'DRIVER') {
    return <Navigate to="/driver" replace />;
  }

  return <Navigate to="/restaurant" replace />;
}