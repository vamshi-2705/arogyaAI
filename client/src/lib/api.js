import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000'),
  timeout: 30000, // 30s — Claude calls can take time
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all requests if available (for nurse routes)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nurse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nurse_token');
      localStorage.removeItem('nurse_data');
      // Only redirect if on a nurse page
      if (window.location.pathname.startsWith('/nurse')) {
        window.location.href = '/nurse/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
