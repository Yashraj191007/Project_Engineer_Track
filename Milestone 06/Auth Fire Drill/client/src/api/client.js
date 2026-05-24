
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FIX F5: Add CSRF header — server requires this on all state-changing requests
  // Malicious cross-origin sites cannot set custom headers, so their requests are blocked
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});

export default api;
