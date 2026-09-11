import { useState } from "react";
import apiClient from "../../services/apiClient";
import { toast } from "react-hot-toast";
import { Shield, Key, Eye, EyeOff, Lock, CheckCircle2, UserCircle, X, ChevronRight } from "lucide-react";
import PageTransition from "../../components/PageTransition";

export default function AdminSettings() {
  // Modal Visibility State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Username State
  const [newUsername, setNewUsername] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  // Evaluate password strength
  const getStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getStrength(newPassword);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["#EF4444", "#F59E0B", "#FBBF24", "#34D399", "#10B981"];

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (strengthScore < 2) {
      toast.error("Please choose a stronger password.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await apiClient.post(
        "/admin/update-password",
        { currentPassword, newPassword },
        { withCredentials: true }
      );
      
      if (res.data.success) {
        toast.success("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordModal(false);
      } else {
        toast.error(res.data.error || "Failed to update password.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Server error occurred.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    setIsUpdatingUsername(true);
    try {
      const res = await apiClient.post(
        "/admin/update-username",
        { newUsername },
        { withCredentials: true }
      );
      
      if (res.data.success) {
        toast.success("Username updated successfully!");
        setNewUsername("");
        setShowUsernameModal(false);
      } else {
        toast.error(res.data.error || "Failed to update username.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Server error occurred.");
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  return (
    <PageTransition>
      <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "30px" }}>
        
        {/* Header */}
        <div style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "20px" }}>
          <h1 style={{ color: "var(--navy)", margin: 0, fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>Security Center</h1>
          <p style={{ color: "var(--text-muted)", margin: "8px 0 0 0", fontSize: "15px" }}>Manage your Super Admin credentials and platform security protocols.</p>
        </div>

        {/* Content Grid */}
        <div className="dash-grid-2" style={{ alignItems: "start" }}>
          
          {/* Action Cards Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Password Action Card */}
            <div 
              onClick={() => setShowPasswordModal(true)}
              style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s" }}
              className="action-card-hover"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key size={24} />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--navy)", fontWeight: "600" }}>Change Password</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Update your cryptographic login key</p>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </div>

            {/* Username Action Card */}
            <div 
              onClick={() => setShowUsernameModal(true)}
              style={{ background: "#fff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "24px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "all 0.2s" }}
              className="action-card-hover"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#F3E8FF", color: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserCircle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--navy)", fontWeight: "600" }}>Change Username</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Update your Super Admin identifier</p>
                </div>
              </div>
              <ChevronRight size={20} color="#9CA3AF" />
            </div>

          </div>

          {/* Security Information Panel */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ background: "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)", borderRadius: "16px", border: "1px solid #E2E8F0", padding: "30px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#DBEAFE", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                <Shield size={20} />
              </div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "var(--navy)", fontWeight: "700" }}>Enterprise Security</h3>
              <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                Your Super Admin password is mathematically hashed using <strong>Bcrypt</strong> with a 10-round cryptographic salt before it ever reaches the database. 
              </p>
              
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--navy)", fontWeight: "500" }}>
                  <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  Irreversible cryptographic hashing
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--navy)", fontWeight: "500" }}>
                  <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  Global Audit Trail tracking for credential resets
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--navy)", fontWeight: "500" }}>
                  <CheckCircle2 size={18} color="#10B981" style={{ flexShrink: 0, marginTop: "2px" }} />
                  Middleware route protection
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ================= PASSWORD MODAL ================= */}
        {showPasswordModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}>
            <div style={{
              background: "#fff", width: "450px", borderRadius: "16px", padding: "30px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative"
            }}>
              <button onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#EFF6FF", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "var(--navy)", fontWeight: "600" }}>Update Password</h2>
              </div>

              <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* Current Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Current Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px", paddingRight: "40px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px", transition: "border 0.2s" }}
                    />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>New Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px", paddingRight: "40px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px", transition: "border 0.2s" }}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength Meter */}
                  {newPassword.length > 0 && (
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: strengthColors[Math.min(strengthScore, 4)] }}>
                        <span>Password Strength</span>
                        <span>{strengthLabels[Math.min(strengthScore, 4)]}</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px", height: "6px" }}>
                        {[0, 1, 2, 3].map((index) => (
                          <div 
                            key={index} 
                            style={{ 
                              flex: 1, 
                              borderRadius: "3px", 
                              background: index < strengthScore ? strengthColors[Math.min(strengthScore, 4)] : "#E5E7EB",
                              transition: "background 0.3s ease"
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Confirm New Password</label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ 
                        width: "100%", padding: "12px", paddingRight: "40px", borderRadius: "8px", outline: "none", fontSize: "14px", transition: "all 0.2s",
                        border: confirmPassword && newPassword !== confirmPassword ? "1px solid #EF4444" : "1px solid #E5E7EB" 
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span style={{ fontSize: "12px", color: "#EF4444", fontWeight: "500" }}>Passwords do not match</span>
                  )}
                </div>

                {/* Submit Buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button 
                    type="button"
                    onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                    style={{ padding: "10px 16px", background: "#F3F4F6", color: "var(--navy)", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingPassword || newPassword !== confirmPassword || strengthScore < 2}
                    style={{
                      padding: "10px 16px", borderRadius: "8px", background: "var(--primary)", color: "#fff",
                      border: "none", fontWeight: "600", cursor: (isUpdatingPassword || newPassword !== confirmPassword || strengthScore < 2) ? "not-allowed" : "pointer",
                      opacity: (isUpdatingPassword || newPassword !== confirmPassword || strengthScore < 2) ? 0.6 : 1, transition: "opacity 0.2s",
                      display: "flex", alignItems: "center", gap: "8px"
                    }}
                  >
                    {isUpdatingPassword ? "Updating..." : <><Lock size={16} /> Update Password</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= USERNAME MODAL ================= */}
        {showUsernameModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
          }}>
            <div style={{
              background: "#fff", width: "450px", borderRadius: "16px", padding: "30px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative"
            }}>
              <button onClick={() => { setShowUsernameModal(false); setNewUsername(""); }} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#F3E8FF", color: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserCircle size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "var(--navy)", fontWeight: "600" }}>Update Username</h2>
              </div>

              <form onSubmit={handleUpdateUsername} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>New Username</label>
                  <input 
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="Enter new admin username"
                    style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px", transition: "border 0.2s" }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button 
                    type="button"
                    onClick={() => { setShowUsernameModal(false); setNewUsername(""); }}
                    style={{ padding: "10px 16px", background: "#F3F4F6", color: "var(--navy)", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingUsername || !newUsername.trim()}
                    style={{
                      padding: "10px 16px", borderRadius: "8px", background: "#9333EA", color: "#fff",
                      border: "none", fontWeight: "600", cursor: (isUpdatingUsername || !newUsername.trim()) ? "not-allowed" : "pointer",
                      opacity: (isUpdatingUsername || !newUsername.trim()) ? 0.6 : 1, transition: "opacity 0.2s"
                    }}
                  >
                    {isUpdatingUsername ? "Updating..." : "Update Username"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
      
      <style>{`
        .action-card-hover:hover {
          transform: translateY(-2px);
          border-color: #BFDBFE !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
    </PageTransition>
  );
}
