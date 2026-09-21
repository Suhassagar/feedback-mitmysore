import axios from 'axios';

// Dynamic fallback: if running on Vercel/production, auto-route to Render backend
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' &&
   window.location.hostname !== 'localhost' &&
   window.location.hostname !== '127.0.0.1'
    ? 'https://mit-feedback-api.onrender.com'
    : 'http://localhost:8081');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom interceptor to bypass Brave's privacy mask
apiClient.interceptors.request.use(async (config) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.brave && await navigator.brave.isBrave()) {
      config.headers['X-Browser-Override'] = 'Brave';
    }
  } catch {
    // Ignore error if browser doesn't support it
  }
  return config;
});

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthAttempt = error.config?.url && (
      error.config.url.includes('/auth/student-login') ||
      error.config.url.includes('/auth/admin-login') ||
      error.config.url.includes('/auth/department-login') ||
      error.config.url.includes('/auth/faculty-login') ||
      error.config.url.includes('/auth/check-session')
    );

    if (!isAuthAttempt && error.response) {
      if (error.response.status === 401) {
        console.warn("Unauthorized access - redirecting to login");
        localStorage.removeItem('role');
        localStorage.removeItem('dept_id');
        window.location.href = '/';
      }
      if (error.response.status === 403) {
        console.warn("Forbidden access");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
