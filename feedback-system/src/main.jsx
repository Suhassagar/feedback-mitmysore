import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import axios from 'axios';
import './theme.css';
import './utilities.css';

axios.defaults.withCredentials = true;

// Custom interceptor to bypass Brave's privacy mask
axios.interceptors.request.use(async (config) => {
  try {
    if (navigator.brave && await navigator.brave.isBrave()) {
      config.headers['X-Browser-Override'] = 'Brave';
    }
  } catch (e) {
    // Ignore error if browser doesn't support it
  }
  return config;
});

// Global Security Tripwire: Catch all 401/403 errors and force logout
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Security Tripwire Triggered: Unauthorized access detected.");
      localStorage.removeItem("role");
      window.location.href = "/"; // Force kick out to login screen
    }
    return Promise.reject(error);
  }
);

import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
