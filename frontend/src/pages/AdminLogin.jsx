import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function AdminLogin() {
  const [username, setusername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { checkSession, user } = useAuth();

  // Auto-redirect removed per user request: ALWAYS show login form even if logged in
  // useEffect(() => {
  //   if (user?.role === "admin") {
  //     navigate("/admin-dashboard");
  //   }
  // }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await apiClient.post("/auth/admin-login", {
        username,
        password,
      });

      if (res.data.success) {
        await checkSession();
        navigate("/admin-dashboard");
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again later.");
    }
  };

  return (
    <PageTransition>
      <div className="flex-center container flex-col" style={{ height: "100vh" }}>
        <div className="login-split-card theme-admin">
          <div className="login-left-panel">
            {/* User Cog SVG */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="15" r="3"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M10 15H6a4 4 0 0 0-4 4v2"/>
              <path d="m21.7 16.4-.9-.3"/>
              <path d="m15.2 13.9-.9-.3"/>
              <path d="m16.6 18.7.3-.9"/>
              <path d="m19.1 12.2.3-.9"/>
              <path d="m19.6 18.7-.4-1"/>
              <path d="m16.8 12.3-.4-1"/>
              <path d="m14.3 16.6 1-.4"/>
              <path d="m20.7 13.8 1-.4"/>
            </svg>
          </div>
          
          <div className="login-right-panel">
            <div className="login-header">
              <div className="login-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M12 8v4"/>
                  <path d="M12 16h.01"/>
                </svg>
              </div>
              <h2>Administrator Login</h2>
            </div>

            <form onSubmit={handleLogin}>
              <div className="login-form-group">
                <label className="field-label">Email Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter admin email or username"
                  value={username}
                  onChange={(e) => setusername(e.target.value)}
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

              {error && <p style={{ color: "var(--danger)", marginBottom: "16px", fontWeight: "500", fontSize: "14px" }}>{error}</p>}
              
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
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

export default AdminLogin;
