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
  timeout: 45000, // 45s runway to accommodate Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Custom interceptor to bypass Brave's privacy mask & attach Vault Bearer token
apiClient.interceptors.request.use(async (config) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.brave && await navigator.brave.isBrave()) {
      config.headers['X-Browser-Override'] = 'Brave';
    }
  } catch {
    // Ignore error if browser doesn't support it
  }

  // Attach Vault token if active in current session
  try {
    if (typeof window !== 'undefined') {
      const vaultToken = sessionStorage.getItem('vault_token');
      if (vaultToken) {
        config.headers['X-Vault-Token'] = vaultToken;
      }
    }
  } catch {
    // Ignore sessionStorage issues
  }

  return config;
});

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isAuthAttempt = config?.url && (
      config.url.includes('/auth/student-login') ||
      config.url.includes('/auth/admin-login') ||
      config.url.includes('/auth/department-login') ||
      config.url.includes('/auth/faculty-login') ||
      config.url.includes('/auth/check-session') ||
      config.url.includes('/vault')
    );

    // Render Cold-Start Resilience: retry initial non-auth read requests once if server is spinning up
    if (config && !config._retry && !isAuthAttempt && (error.code === 'ECONNABORTED' || [502, 503, 504].includes(error.response?.status))) {
      config._retry = true;
      console.warn("[ApiClient] Server spin-up detected, auto-retrying request in 2.5s...");
      await new Promise((r) => setTimeout(r, 2500));
      return apiClient(config);
    }

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
