import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Lock, User, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const { admin, login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validate redirect destination against strict allowlist to prevent open redirect vulnerabilities
  const rawFrom = location.state?.from;
  const safeRedirect =
    typeof rawFrom === 'string' && rawFrom.startsWith('/admin')
      ? rawFrom
      : '/admin/dashboard';

  useEffect(() => {
    if (admin) {
      if (admin.role === 'cashier') {
        navigate('/cashier/pos', { replace: true });
      } else {
        const dest = safeRedirect.startsWith('/cashier') ? '/admin/dashboard' : safeRedirect;
        navigate(dest, { replace: true });
      }
    }
  }, [admin, navigate, safeRedirect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await login(username.trim(), password);
      const role = res?.role || res?.session?.role || 'admin';
      if (role === 'cashier') {
        addToast(`Welcome back, Cashier ${username.trim()}.`, 'success');
        navigate('/cashier/pos', { replace: true });
      } else {
        addToast(`Welcome back, Admin ${username.trim()}.`, 'success');
        navigate(safeRedirect.startsWith('/cashier') ? '/admin/dashboard' : safeRedirect, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials or connection error.';
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Back to Home */}
        <Link
          to="/"
          id="login-back-home-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <div className="login-logo">
          <img
            src="/gians.png"
            alt="Gian's Logo"
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              objectFit: 'contain',
              margin: '0 auto 16px auto',
              display: 'block',
              boxShadow: '0 8px 24px rgba(44, 24, 16, 0.12)',
              border: '2px solid var(--color-border)',
              background: '#fff',
            }}
          />
          <h1 className="login-title">Staff Portal</h1>
          <p className="login-sub">Sign in as Administrator or Counter Cashier</p>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(176, 64, 64, 0.08)',
              border: '1px solid rgba(176, 64, 64, 0.25)',
              color: 'var(--color-unavailable)',
              fontSize: '0.85rem',
              marginBottom: '20px',
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-username">
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-username"
                type="text"
                className={`form-input ${errorMessage ? 'error' : ''}`}
                style={{ width: '100%', paddingLeft: '38px' }}
                placeholder="Enter admin username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className={`form-input ${errorMessage ? 'error' : ''}`}
                style={{ width: '100%', paddingLeft: '38px', paddingRight: '40px' }}
                placeholder="Enter password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-full"
            disabled={submitting}
            id="admin-login-submit-btn"
            style={{ marginTop: '24px' }}
          >
            {submitting ? (
              <>
                <Loader2 className="spinner" size={16} />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Portal</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
