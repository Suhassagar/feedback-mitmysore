import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import PageTransition from "../components/PageTransition";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function FacultyLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { checkSession, user } = useAuth();

  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role === "faculty") {
      navigate("/faculty-dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiClient.post("/auth/faculty-login", {
        email,
        password,
      });

      if (res.data.success) {
        await checkSession();
        navigate("/faculty-dashboard");
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Network Error - Unable to connect");
    }
  };

  return (
    <PageTransition>
      <div className="flex-center container flex-col" style={{ height: "100vh" }}>
        <div className="login-split-card theme-faculty">
          <div className="login-left-panel">
            {/* Faculty/Presentation SVG */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h20"/>
              <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/>
              <path d="m7 21 5-5 5 5"/>
            </svg>
          </div>
          
          <div className="login-right-panel">
            <div className="login-header">
              <div className="login-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 14c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7z"/>
                  <path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"/>
                </svg>
              </div>
              <h2>Faculty Login</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter faculty email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="field-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    className="eye-icon-btn" 
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#">Forgot Password?</a>
              </div>

              {error && (
                <div style={{ color: "#ef4444", fontSize: "14px", marginTop: "10px", textAlign: "center", backgroundColor: "#fee2e2", padding: "8px", borderRadius: "6px" }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "15px" }}>
                Sign In
              </button>
            </form>

            <a href="#" className="login-back-link" onClick={(e) => { e.preventDefault(); navigate("/"); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <ArrowLeft size={16} /> Back to Portal
            </a>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
