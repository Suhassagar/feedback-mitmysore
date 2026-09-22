import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../services/apiClient';
import './HomePortal.css';

export default function HomePortal() {
  const navigate = useNavigate();

  // Registration Modal State (kept for functionality)
  const [showRegPopup, setShowRegPopup] = useState(false);
  const [regFormData, setRegFormData] = useState({
    dept_id: "",
    faculty_id: "",
    name: "",
    email: "",
  });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchDepts = async (attempts = 2) => {
      try {
        const res = await apiClient.get("/departments");
        if (isMounted) setDepartments(res.data);
      } catch (err) {
        if (attempts > 1) {
          setTimeout(() => fetchDepts(attempts - 1), 2000);
        } else {
          console.warn("Could not load departments initially (Render cold start):", err?.message);
        }
      }
    };
    fetchDepts();

    const role = localStorage.getItem("role");
    if (role === "admin") {
      navigate("/admin-dashboard");
    } else if (role === "department") {
      const storedDeptId = localStorage.getItem("dept_id");
      if (storedDeptId) navigate(`/department-dashboard/${storedDeptId}`);
    }

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleRegChange = (e) => {
    setRegFormData({ ...regFormData, [e.target.name]: e.target.value });
  };

  const registerFaculty = async () => {
    try {
      const res = await apiClient.post("/faculty/register", regFormData);

      if (res.data.success) {
        toast.success(res.data.message || "Registered successfully!");
        setShowRegPopup(false);
      } else {
        toast.error(res.data.message || "Registration failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Network error");
    }
  };

  return (
    <div className="home-split-container">
      {/* LEFT PANEL HERO */}
      <div className="home-left-panel">
        <div className="home-left-overlay"></div>
        <div className="home-left-content">
          <div className="home-logo-section">
            <img src="/logo.jpeg" alt="MIT Mysore Logo" className="home-logo" />
            <div className="home-logo-text">
              <strong>Maharaja Institute of Technology<br />Mysore</strong>
              <span>Est. 2007</span>
            </div>
          </div>

          <div className="home-hero-text">
            <h1>Student Feedback<br />Management System</h1>
            <p>Your feedback shapes better tomorrow.</p>
          </div>

          <div className="home-quote-box">
            <div className="home-quote-icon">“</div>
            <p>Excellence in education is built on continuous insight and improvement.</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL LOGIN OPTIONS */}
      <div className="home-right-panel">


        <div className="home-portal-grid">
          {/* Administrator Card */}
          <div className="home-portal-card portal-admin">
            <div className="portal-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="15" r="3" />
                <circle cx="9" cy="7" r="4" />
                <path d="M10 15H6a4 4 0 0 0-4 4v2" />
                <path d="m21.7 16.4-.9-.3" />
                <path d="m15.2 13.9-.9-.3" />
                <path d="m16.6 18.7.3-.9" />
                <path d="m19.1 12.2.3-.9" />
                <path d="m19.6 18.7-.4-1" />
                <path d="m16.8 12.3-.4-1" />
                <path d="m14.3 16.6 1-.4" />
                <path d="m20.7 13.8 1-.4" />
              </svg>
            </div>
            <h3>Administrator</h3>
            <p>Manage system settings, users and overall platform.</p>
            <button className="portal-btn" onClick={() => navigate('/admin-login')}>
              Login as Admin <span>→</span>
            </button>
          </div>

          {/* Department Card */}
          <div className="home-portal-card portal-dept">
            <div className="portal-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01" />
                <path d="M16 6h.01" />
                <path d="M12 6h.01" />
                <path d="M12 10h.01" />
                <path d="M12 14h.01" />
                <path d="M16 10h.01" />
                <path d="M16 14h.01" />
                <path d="M8 10h.01" />
                <path d="M8 14h.01" />
              </svg>
            </div>
            <h3>Department</h3>
            <p>Create sessions, manage subjects and students.</p>
            <button className="portal-btn" onClick={() => navigate('/department-login')}>
              Login as Department <span>→</span>
            </button>
          </div>

          {/* Faculty Card */}
          <div className="home-portal-card portal-faculty">
            <div className="portal-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h20" />
                <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
                <path d="m7 21 5-5 5 5" />
              </svg>
            </div>
            <h3>Faculty</h3>
            <p>View feedback analytics and student responses.</p>
            <button className="portal-btn" onClick={() => navigate('/faculty-login')}>
              Login as Faculty <span>→</span>
            </button>
          </div>

          {/* Student Card */}
          <div className="home-portal-card portal-student">
            <div className="portal-icon-wrapper">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <h3>Student</h3>
            <p>Submit feedback for your courses and faculty.</p>
            <button className="portal-btn" onClick={() => navigate('/student-login')}>
              Login as Student <span>→</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: "48px", color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>
          Developed by Suhas J. Sagar | Department of CSE
        </div>

        <div className="home-footer" style={{ marginTop: "16px" }}>
          <span>🎧</span>
          <span>Need help? <a href="#">Contact System Administrator</a></span>
          <span style={{ margin: "0 10px", color: "var(--border-color)" }}>|</span>
          <span onClick={() => setShowRegPopup(true)} style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 500 }}>
            New Faculty Registration
          </span>
        </div>
      </div>

      {/* Registration Modal Popup */}
      {showRegPopup && (
        <div className="glass-modal-overlay">
          <div className="glass-modal flex-col gap-md">
            <h2 className="title-medium" style={{ margin: 0, textAlign: "center", color: "var(--text-primary)" }}>Register Faculty</h2>

            <select
              name="dept_id"
              onChange={handleRegChange}
              value={regFormData.dept_id}
              className="form-input"
              style={{ marginBottom: "15px" }}
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name}
                </option>
              ))}
            </select>

            <input
              type="text"
              name="faculty_id"
              placeholder="Faculty ID"
              onChange={handleRegChange}
              className="form-input"
              style={{ marginBottom: "15px" }}
            />

            <input
              type="text"
              name="name"
              placeholder="Name"
              onChange={handleRegChange}
              className="form-input"
              style={{ marginBottom: "15px" }}
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleRegChange}
              className="form-input"
              style={{ marginBottom: "20px" }}
            />

            <div className="flex-col gap-sm">
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={registerFaculty}>
                Register
              </button>
              <button
                className="btn"
                style={{ width: "100%" }}
                onClick={() => setShowRegPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
