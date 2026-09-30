import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="state-center" style={{ minHeight: '60vh' }}>
        <Loader2 className="spinner" size={32} />
        <p className="state-sub">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    const validRedirect = location.pathname.startsWith('/') ? location.pathname : '/admin/dashboard';
    return <Navigate to="/admin/login" state={{ from: validRedirect }} replace />;
  }

  // Check role restrictions if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to role-appropriate home
    if (user.role === 'cashier') return <Navigate to="/cashier/pos" replace />;
    if (user.role === 'rider')   return <Navigate to="/rider" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
