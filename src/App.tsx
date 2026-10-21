import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRedirect } from './routes/RoleRedirect';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Dashboards are split per role so each user downloads only their screens (and Leaflet lazily).
const RestaurantDashboard = lazy(() =>
  import('./pages/restaurant/RestaurantDashboard').then((module) => ({ default: module.RestaurantDashboard })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const DriverDashboard = lazy(() => import('./pages/driver/DriverDashboard').then((module) => ({ default: module.DriverDashboard })));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#F6F3EE] text-sm text-slate-500">Chargement…</div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']} />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
