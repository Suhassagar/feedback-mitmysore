import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    document.title = "404 - Page Not Found | MITM ABHIPRAYA";

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          document.title = "MITM ABHIPRAYA | Student Feedback & Course Appraisal Portal";
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      document.title = "MITM ABHIPRAYA | Student Feedback & Course Appraisal Portal";
    };
  }, [navigate]);

  return (
    <div className="simple-404-wrapper">
      <main className="simple-404-card">
        <div className="simple-404-header">
          <img src="/logo.jpeg" alt="MITM ABHIPRAYA Logo" className="simple-404-logo" />
          <div className="simple-404-college">
            <strong>Maharaja Institute of Technology Mysore</strong>
            <span>MITM ABHIPRAYA • Student Feedback Management System</span>
          </div>
        </div>

        <div className="simple-404-badge">404 Not Found</div>

        <h1 className="simple-404-title">Page Not Found</h1>

        <p className="simple-404-desc">
          The requested page <code className="simple-404-code">{location.pathname}</code> could not be found.
        </p>

        <p className="simple-404-countdown">
          Automatically redirecting to the Home Portal in <strong>{countdown}s</strong>...
        </p>

        <button 
          type="button" 
          className="simple-404-btn"
          onClick={() => {
            document.title = "MITM ABHIPRAYA | Student Feedback & Course Appraisal Portal";
            navigate('/', { replace: true });
          }}
        >
          <Home size={18} />
          <span>Go to Home Portal</span>
        </button>
      </main>
    </div>
  );
}
