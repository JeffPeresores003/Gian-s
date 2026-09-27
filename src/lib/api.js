import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // send HTTP-only cookies
  timeout: 10000,
});

export const getImageUrl = (imageUrl) => {
  if (!imageUrl || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return new URL(imageUrl, `${apiUrl}/`).toString();
};

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove auth state — handled by AuthContext
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
