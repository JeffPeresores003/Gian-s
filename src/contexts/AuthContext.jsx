import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gians_user');
      const token = localStorage.getItem('gians_token');
      return (saved && token) ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // If we already have a cached authenticated user, don't block the UI with full-page loader
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('gians_user');
    } catch {
      return true;
    }
  });

  const checkSession = useCallback(async () => {
    const token = localStorage.getItem('gians_token');
    // If no token exists and no user is cached, ensure user is null
    if (!token && !localStorage.getItem('gians_user')) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      localStorage.setItem('gians_user', JSON.stringify(data));
      return data;
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('gians_token');
        localStorage.removeItem('gians_user');
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    const handleUnauthorized = () => {
      try {
        localStorage.removeItem('gians_token');
        localStorage.removeItem('gians_user');
      } catch {
        // ignore
      }
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkSession]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const userObj = res.data.user || {
      id: res.data.id,
      username: res.data.username || username,
      role: res.data.role || 'admin',
    };

    if (res.data.token) {
      try {
        localStorage.setItem('gians_token', res.data.token);
      } catch {
        // ignore
      }
    }

    try {
      localStorage.setItem('gians_user', JSON.stringify(userObj));
    } catch {
      // ignore
    }

    setUser(userObj);
    return { ...res.data, session: userObj };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      try {
        localStorage.removeItem('gians_token');
        localStorage.removeItem('gians_user');
      } catch {
        // ignore
      }
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';
  const isRider = user?.role === 'rider';

  return (
    <AuthContext.Provider
      value={{
        user,
        admin: user, // backward compatibility
        role: user?.role || null,
        isAdmin,
        isCashier,
        isRider,
        loading,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
