import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, ShoppingBag } from 'lucide-react';

export default function FloatingAdminButton() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user?.role === 'cashier') {
      navigate('/cashier/pos');
    } else if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/admin/login');
    }
  };

  const isCashier = user?.role === 'cashier';

  return (
    <button
      type="button"
      className="btn-floating-admin"
      onClick={handleClick}
      aria-label={user ? `${user.role} portal` : 'Staff access'}
      title={user ? `${user.username} (${user.role})` : 'Staff Portal (Admin / Cashier)'}
      id="floating-admin-btn"
    >
      {isCashier ? (
        <ShoppingBag size={18} strokeWidth={2} />
      ) : (
        <ShieldCheck size={18} strokeWidth={2} />
      )}
    </button>
  );
}
