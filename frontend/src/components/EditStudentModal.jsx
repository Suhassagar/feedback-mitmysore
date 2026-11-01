import React, { useState, useEffect } from "react";
import { X, UserCheck, AlertCircle, Loader2, Save } from "lucide-react";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";

export default function EditStudentModal({
  isOpen,
  student,
  dept_id,
  onClose,
  onUpdated
}) {
  const [usn, setUsn] = useState("");
  const [name, setName] = useState("");
  const [sem, setSem] = useState(1);
  const [section, setSection] = useState("A");
  const [email, setEmail] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setUsn(student.usn || "");
      setName(student.name || "");
      setSem(student.sem ? parseInt(student.sem, 10) : 1);
      setSection(student.section ? String(student.section).toUpperCase() : "A");
      setEmail(student.email || "");
      setFormErrors({});
    }
  }, [student, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSaving) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !student) return null;

  const validate = () => {
    const errors = {};
    if (!usn.trim()) errors.usn = "USN is required";
    if (!name.trim()) errors.name = "Full name is required";
    if (!sem || isNaN(sem) || sem < 1 || sem > 8) errors.sem = "Valid semester (1-8) required";
    if (!section || !/^[A-H]$/.test(section.trim().toUpperCase())) errors.section = "Section must be A-H";
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return toast.error("Please resolve highlighted validation errors");
    }

    setIsSaving(true);
    try {
      const cleanOldUsn = student.usn;
      const cleanNewUsn = usn.trim().toUpperCase();
      const cleanName = name.trim();
      const cleanSem = parseInt(sem, 10);
      const cleanSection = section.trim().toUpperCase();
      const cleanEmail = (email && email.trim()) ? email.trim().toLowerCase() : null;

      const payload = {
        usn: cleanNewUsn,
        name: cleanName,
        sem: cleanSem,
        section: cleanSection,
        email: cleanEmail,
        dept_id: dept_id || student.dept_id
      };

      const res = await apiClient.put(`/students/${cleanOldUsn}`, payload, { withCredentials: true });

      if (res.data?.success) {
        toast.success(res.data.message || "Student information updated successfully!");
        if (typeof onUpdated === "function") {
          onUpdated(res.data.student);
        }
        onClose();
      } else {
        toast.error(res.data?.message || "Failed to update student");
      }
    } catch (err) {
      console.error("Error updating student:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to update student";
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const hasFeedbackDone = student.feedback_given === "done";
  const semSecChanged = student.sem !== parseInt(sem, 10) || student.section !== section;

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!isSaving) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#FFFFFF",
          borderRadius: "20px",
          padding: "24px 28px",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)",
          animation: "slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(37, 99, 235, 0.1)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 2px 0", fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
                Edit Student Info
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                Update academic credentials and profile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close edit student modal"
            style={{
              background: "transparent",
              border: "none",
              cursor: isSaving ? "not-allowed" : "pointer",
              padding: "6px",
              borderRadius: "8px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F1F5F9")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning if feedback already given and sem/section changing */}
        {hasFeedbackDone && semSecChanged && (
          <div
            style={{
              padding: "10px 14px",
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#92400E",
              fontSize: "12.5px",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              This student has already completed feedback in their previous session. Their feedback record will be safely retained.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* USN Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
              University Seat Number (USN) <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              disabled={isSaving}
              placeholder="e.g. 4MT22CS001"
              style={{
                padding: "9px 12px",
                fontSize: "13.5px",
                fontFamily: "monospace",
                fontWeight: "600",
                borderRadius: "8px",
                border: `1px solid ${formErrors.usn ? "#EF4444" : "#CBD5E1"}`,
                outline: "none",
                background: "#F8FAFC",
              }}
            />
            {formErrors.usn && (
              <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: "600" }}>
                {formErrors.usn}
              </span>
            )}
          </div>

          {/* Full Name Field */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
              Full Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. John Doe"
              style={{
                padding: "9px 12px",
                fontSize: "13.5px",
                borderRadius: "8px",
                border: `1px solid ${formErrors.name ? "#EF4444" : "#CBD5E1"}`,
                outline: "none",
              }}
            />
            {formErrors.name && (
              <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: "600" }}>
                {formErrors.name}
              </span>
            )}
          </div>

          {/* Sem & Section row */}
          <div style={{ display: "flex", gap: "12px" }}>
            {/* Semester */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
                Semester <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={sem}
                onChange={(e) => setSem(parseInt(e.target.value, 10))}
                disabled={isSaving}
                style={{
                  padding: "9px 12px",
                  fontSize: "13.5px",
                  borderRadius: "8px",
                  border: `1px solid ${formErrors.sem ? "#EF4444" : "#CBD5E1"}`,
                  outline: "none",
                  background: "#FFFFFF",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
                Section <span style={{ color: "red" }}>*</span>
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase())}
                disabled={isSaving}
                style={{
                  padding: "9px 12px",
                  fontSize: "13.5px",
                  borderRadius: "8px",
                  border: `1px solid ${formErrors.section ? "#EF4444" : "#CBD5E1"}`,
                  outline: "none",
                  background: "#FFFFFF",
                }}
              >
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email (Optional) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "12.5px", fontWeight: "600", color: "#334155" }}>
              Email Address <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "400" }}>(Optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSaving}
              placeholder="student@example.com (optional)"
              style={{
                padding: "9px 12px",
                fontSize: "13.5px",
                borderRadius: "8px",
                border: `1px solid ${formErrors.email ? "#EF4444" : "#CBD5E1"}`,
                outline: "none",
              }}
            />
            {formErrors.email && (
              <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: "600" }}>
                {formErrors.email}
              </span>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                padding: "9px 16px",
                borderRadius: "9px",
                border: "1px solid #CBD5E1",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: "600",
                fontSize: "13px",
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "9px 18px",
                borderRadius: "9px",
                border: "none",
                background: "var(--primary)",
                color: "#FFFFFF",
                fontWeight: "600",
                fontSize: "13px",
                cursor: isSaving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                opacity: isSaving ? 0.75 : 1,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
