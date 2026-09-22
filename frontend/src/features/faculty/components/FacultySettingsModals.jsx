import { useState, useEffect } from "react";
import apiClient from "../../../services/apiClient";
import { toast } from "react-hot-toast";

export default function FacultySettingsModals({
  activeSettingModal,
  setActiveSettingModal,
  profile,
  onProfileUpdated
}) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    joining_date: "",
    dob: ""
  });
  const [loading, setLoading] = useState(false);

  // Pre-fill form when modal opens
  useEffect(() => {
    if (activeSettingModal && profile) {
      setFormData({
        email: profile.email || "",
        password: "",
        joining_date: profile.joining_date ? profile.joining_date.split('T')[0] : "",
        dob: profile.dob ? profile.dob.split('T')[0] : ""
      });
    }
  }, [activeSettingModal, profile]);

  if (!activeSettingModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {};
    if (activeSettingModal === 'email') payload.email = formData.email;
    if (activeSettingModal === 'password') payload.password = formData.password;
    if (activeSettingModal === 'joining_date') payload.joining_date = formData.joining_date;
    if (activeSettingModal === 'dob') payload.dob = formData.dob;

    try {
      const res = await apiClient.put("/faculty/profile/update", payload, { withCredentials: true });
      if (res.data.success) {
        toast.success(res.data.message || "Updated successfully");
        if (onProfileUpdated) onProfileUpdated();
        setActiveSettingModal(null);
      } else {
        toast.error(res.data.message || "Failed to update");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const modalTitles = {
    email: "Update Email Address",
    password: "Change Password",
    joining_date: "Update Joining Date",
    dob: "Update Date of Birth"
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveSettingModal(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100000, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "400px", borderRadius: "16px", background: "#ffffff", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
            {modalTitles[activeSettingModal]}
          </h3>
          <button onClick={() => setActiveSettingModal(null)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {activeSettingModal === 'email' && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>New Email Address</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none" }}
              />
            </div>
          )}

          {activeSettingModal === 'password' && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>New Password</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none" }}
              />
            </div>
          )}

          {activeSettingModal === 'joining_date' && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Joining Date</label>
              <input 
                type="date" 
                required
                value={formData.joining_date}
                onChange={(e) => setFormData({...formData, joining_date: e.target.value})}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none" }}
              />
            </div>
          )}

          {activeSettingModal === 'dob' && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "6px" }}>Date of Birth</label>
              <input 
                type="date" 
                required
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "14px", outline: "none" }}
              />
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
            <button type="button" onClick={() => setActiveSettingModal(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "#fff", color: "var(--text-primary)", fontWeight: "500", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", fontWeight: "500", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
