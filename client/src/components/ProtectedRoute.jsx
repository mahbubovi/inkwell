import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Pages that need a logged-in user.
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="max-w-6xl mx-auto px-4 py-10 text-mute">Checking your session…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

// Login and register: logged-in users go to where they were headed, or the dashboard.
export function PublicOnly() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  return user ? <Navigate to={location.state?.from?.pathname || '/dashboard'} replace /> : <Outlet />;
}
