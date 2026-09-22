import { useState } from "react";
import apiClient from "../services/apiClient";
import { useParams, useOutletContext } from "react-router-dom";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { Settings, AlertTriangle, Lock, Eye, EyeOff, Key } from "lucide-react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDepartmentName } from "../hooks/useDepartmentName";

function DepartmentSettings() {
  const { dept_id } = useParams();
  const { loadAnalytics } = useAnalytics(dept_id);
  const deptName = useDepartmentName(dept_id);
  
  const [modalAction, setModalAction] = useState(null); // 'feedback' or 'faculty'
  const [confirmText, setConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Security States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleResetFeedback = async () => {
    setIsResetting(true);
    try {
      await apiClient.delete(`/department/${dept_id}/feedback-reset`, { withCredentials: true });
      toast.success("All feedback data has been wiped successfully.");
      setModalAction(null);
      setConfirmText("");
      if (loadAnalytics) loadAnalytics();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset feedback data.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetFaculty = async () => {
    setIsResetting(true);
    try {
      await apiClient.delete(`/department/${dept_id}/faculty-reset`, { withCredentials: true });
      toast.success("Faculty roster has been wiped successfully.");
      setModalAction(null);
      setConfirmText("");
      if (loadAnalytics) loadAnalytics();
    } catch (err) {
      console.error(err);
      toast.error("Failed to wipe faculty roster.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleConfirmAction = () => {
    if (modalAction === 'feedback' && confirmText !== 'RESET') return toast.error("Type RESET to confirm.");
    if (modalAction === 'faculty' && confirmText !== 'WIPE FACULTY') return toast.error("Type WIPE FACULTY to confirm.");
    
    if (modalAction === 'feedback') handleResetFeedback();
    else if (modalAction === 'faculty') handleResetFaculty();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match!");
    }
    if (newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters.");
    }
    
    setIsChangingPassword(true);
    try {
      const res = await apiClient.put(`/department/${dept_id}/change-password`, {
        currentPassword,
        newPassword
      }, { withCredentials: true });
      
      toast.success(res.data.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setModalAction(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex-col gap-lg" style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginBottom: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--bg-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
            <Settings size={24} />
          </div>
          <div>
            <h2 className="title-large text-gradient" style={{ margin: 0 }}>Department Settings</h2>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "14px" }}>
              Configure preferences and manage critical data for <strong style={{ color: "var(--navy)" }}>{deptName || dept_id}</strong>.
            </p>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="card" style={{ border: "1px solid var(--border-color)", overflow: "hidden" }}>
          <div style={{ background: "var(--bg-light)", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
            <Lock size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px", fontWeight: "600" }}>Security & Authentication</h3>
          </div>
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--text-primary)" }}>Update Password</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                Ensure your department account is using a long, secure password. You will need your current password to make changes.
              </p>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ padding: "12px 24px", height: "auto", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => setModalAction('password')}
            >
              <Key size={16} /> Change Password
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border: "1px solid #FECACA", overflow: "hidden" }}>
          <div style={{ background: "#FEF2F2", padding: "16px 24px", borderBottom: "1px solid #FECACA", display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={20} color="#DC2626" />
            <h3 style={{ margin: 0, color: "#991B1B", fontSize: "16px", fontWeight: "600" }}>Danger Zone</h3>
          </div>
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--text-primary)" }}>Reset Feedback Data</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                This action will permanently wipe all anonymous 1-5 star ratings submitted by students for this department. 
                It will also reset the completion status for all students so they can take the survey again. <strong>Active sessions will remain open.</strong>
              </p>
            </div>
            <button 
              className="btn btn-delete" 
              style={{ padding: "12px 24px", height: "auto", fontSize: "14px", fontWeight: "600" }}
              onClick={() => setModalAction('feedback')}
            >
              Reset Feedback
            </button>
          </div>
          
          <div style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "15px", color: "var(--text-primary)" }}>Wipe Faculty Roster</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                This action will permanently delete all professors from this department. It will also cascade and delete any of their subject assignments and collected feedback.
              </p>
            </div>
            <button 
              className="btn btn-delete" 
              style={{ padding: "12px 24px", height: "auto", fontSize: "14px", fontWeight: "600" }}
              onClick={() => setModalAction('faculty')}
            >
              Delete Faculty
            </button>
          </div>
        </div>

      </div>

      {/* Security Modal */}
      {modalAction && (
        <div className="glass-modal-overlay">
          <div className="glass-modal" style={{ maxWidth: "400px", padding: "32px", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "700", color: modalAction === 'password' ? "var(--primary)" : "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}>
              {modalAction === 'password' ? <Lock size={20} /> : <AlertTriangle size={20} />} 
              {modalAction === 'password' ? 'Change Password' : 'Are you absolutely sure?'}
            </h3>
            
            {modalAction === 'password' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(e); }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ position: "relative" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Current Password</label>
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none", background: "#f8fafc" }}
                    required
                  />
                </div>
                
                <div style={{ position: "relative" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type={showPasswords ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      style={{ width: "100%", padding: "10px 12px", paddingRight: "40px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none", background: "#f8fafc" }}
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPasswords(!showPasswords)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ position: "relative", marginBottom: "8px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Confirm New Password</label>
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none", background: "#f8fafc" }}
                    required
                    minLength={6}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalAction(null)} disabled={isChangingPassword}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
                    {isChangingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "20px" }}>
                  This action cannot be undone. {modalAction === 'feedback' 
                    ? "This will permanently delete all student feedback ratings for the entire department and reset student tracking."
                    : "This will permanently delete all professors, their assignments, and any feedback they have received."}
                </p>

                <div className="flex-col gap-sm" style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                    Please type <strong>{modalAction === 'feedback' ? "RESET" : "WIPE FACULTY"}</strong> to confirm.
                  </label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder={modalAction === 'feedback' ? "RESET" : "WIPE FACULTY"}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setModalAction(null); setConfirmText(""); }}
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-delete" 
                    onClick={handleConfirmAction}
                    disabled={(modalAction === 'feedback' && confirmText !== 'RESET') || (modalAction === 'faculty' && confirmText !== 'WIPE FACULTY') || isResetting}
                    style={{ opacity: ((modalAction === 'feedback' && confirmText === 'RESET') || (modalAction === 'faculty' && confirmText === 'WIPE FACULTY')) && !isResetting ? 1 : 0.5, cursor: "pointer" }}
                  >
                    {isResetting ? "Executing..." : "I understand, delete data"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}

export default DepartmentSettings;
