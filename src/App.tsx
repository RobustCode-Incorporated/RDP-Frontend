import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRedirect } from './routes/RoleRedirect';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { RestaurantDashboard } from './pages/restaurant/RestaurantDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { DriverDashboard } from './pages/driver/DriverDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<RoleRedirect />} />
        
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['RESTAURANT']} />}>
          <Route path="/restaurant" element={<RestaurantDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
          <Route path="/driver" element={<DriverDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}