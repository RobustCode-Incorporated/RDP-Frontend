import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { homePathForRole } from './homePath';

export function RoleRedirect() {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homePathForRole(user.role)} replace />;
}
