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
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error response exists and handle specific status codes
    if (error.response) {
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
