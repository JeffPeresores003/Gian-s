import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // send HTTP-only cookies
  timeout: 10000,
});

export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  if (
    imageUrl.startsWith('data:') ||
    imageUrl.startsWith('blob:') ||
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://')
  ) {
    return imageUrl.startsWith('http://') && window.location.protocol === 'https:'
      ? imageUrl.replace(/^http:/, 'https:')
      : imageUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return new URL(imageUrl, `${apiUrl}/`).toString();
};

// Request interceptor — attach Bearer token if present
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('gians_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // localStorage may not be available in private mode or non-browser environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('gians_token');
        localStorage.removeItem('gians_user');
      } catch {
        // ignore
      }
      // Remove auth state — handled by AuthContext
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
