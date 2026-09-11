import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081',
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
