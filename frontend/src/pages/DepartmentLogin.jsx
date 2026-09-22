import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DepartmentLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { checkSession, user } = useAuth();

  // Auto-redirect removed per user request: ALWAYS show login form even if logged in
  // useEffect(() => {
  //   if (user?.role === "department") {
  //     navigate(`/department-dashboard/${user.dept_id}`);
  //   }
  // }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await apiClient.post("/auth/department-login", {
        username: username.toLowerCase(),
        password,
      });

      if (res.data.success) {
        await checkSession();
        navigate(`/department-dashboard/${res.data.dept_id}`);
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
        <div className="login-split-card theme-department">
          <div className="login-left-panel">
            {/* Building SVG */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

          <div className="login-right-panel">
            <div className="login-header">
              <div className="login-icon-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M9 8h1" />
                  <path d="M9 12h1" />
                  <path d="M9 16h1" />
                  <path d="M14 8h1" />
                  <path d="M14 12h1" />
                  <path d="M14 16h1" />
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                </svg>
              </div>
              <h2>Department Login</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label className="field-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter department username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
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
