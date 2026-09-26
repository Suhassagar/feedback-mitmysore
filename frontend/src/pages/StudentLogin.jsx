import { useState } from "react";
import apiClient from "../services/apiClient";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { ArrowLeft } from "lucide-react";

export default function StudentLogin() {
  const [usn, setUsn] = useState("");
  const [session_id, setSessionId] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanUsn = usn.trim().toUpperCase();
    const cleanSessionId = session_id.trim();

    try {
      const res = await apiClient.post(
        "/auth/student-login",
        { usn: cleanUsn, session_id: cleanSessionId },
        { withCredentials: true }
      );

      sessionStorage.removeItem('feedback_student_seed');
      sessionStorage.setItem('student_usn', cleanUsn);
      navigate("/feedback", { state: { session_id: cleanSessionId, usn: cleanUsn } });
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message);
      } else {
        setError("Network error - check server");
      }
    }
  };

  return (
    <PageTransition>
      <div className="flex-center container flex-col" style={{ minHeight: "100vh", height: "auto", padding: "24px 16px" }}>
        <div className="login-split-card theme-student">
          <div className="login-left-panel">
            {/* Student/Graduation Cap SVG */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
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
              <h2>Student Login</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label className="field-label">USN / Register Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your USN"
                  value={usn}
                  onChange={(e) => setUsn(e.target.value)}
                  required
                />
              </div>

              <div className="login-form-group">
                <label className="field-label">Session ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter session ID"
                  value={session_id}
                  onChange={(e) => setSessionId(e.target.value)}
                  required
                />
              </div>

              <div className="login-options">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#">Need help?</a>
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
