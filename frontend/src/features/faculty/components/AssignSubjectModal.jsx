import React, { useState } from "react";
import { Plus, BookOpen, AlertCircle } from "lucide-react";

export default function AssignSubjectModal({ 
  selectedFaculty, 
  showAssignModal, 
  setShowAssignModal, 
  departmentCourses, 
  assignForm, 
  setAssignForm, 
  handleAssignSubmit 
}) {
  const [errors, setErrors] = useState({});

  if (!showAssignModal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!assignForm.courseCode) newErrors.courseCode = "Please select a course module";
    if (!assignForm.sem) {
      newErrors.sem = "Semester is required";
    } else if (parseInt(assignForm.sem, 10) < 1 || parseInt(assignForm.sem, 10) > 8) {
      newErrors.sem = "Sem must be 1-8";
    }
    if (!assignForm.section || !assignForm.section.trim()) {
      newErrors.section = "Section is required (e.g. A, B)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    handleAssignSubmit(e);
  };

  return (
    <div className="modal-overlay" onClick={() => setShowAssignModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s", padding: "16px" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "560px", padding: "32px 36px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", border: "1px solid var(--border-color)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h3 className="title-medium text-gradient" style={{ margin: 0, fontSize: "22px" }}>Assign Subject</h3>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>Faculty: <strong>{selectedFaculty.name}</strong></p>
          </div>
          <button 
            className="btn" 
            onClick={() => setShowAssignModal(false)} 
            aria-label="Close modal"
            style={{ width: "36px", height: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", border: "none", borderRadius: "50%", color: "var(--text-secondary)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-light)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.transform = "rotate(0deg)"; }}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-col gap-md">
          <div className="form-group" style={{ marginBottom: "18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
              <BookOpen size={14} color="var(--primary)"/> Course Module *
            </label>
            <select 
              className="form-input" 
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                borderRadius: "12px", 
                border: errors.courseCode ? "1.5px solid #EF4444" : "1px solid #e2e8f0", 
                boxShadow: errors.courseCode ? "0 0 0 1px #EF4444" : "none",
                fontSize: "14px", 
                background: "#f8fafc", 
                transition: "all 0.2s", 
                cursor: "pointer", 
                outline: "none" 
              }} 
              value={assignForm.courseCode} 
              onChange={(e) => {
                setAssignForm({...assignForm, courseCode: e.target.value});
                if (errors.courseCode) setErrors(prev => ({ ...prev, courseCode: "" }));
              }} 
            >
              <option value="">Select Course...</option>
              {departmentCourses.map(c => <option key={c.course_id} value={c.course_code}>{c.course_code} — {c.course_name} — Sem {c.sem}</option>)}
            </select>
            {errors.courseCode && (
              <span style={{ fontSize: "11.5px", color: "#DC2626", fontWeight: "600", marginTop: "4px", display: "block" }}>{errors.courseCode}</span>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "16px", marginBottom: "28px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Semester *</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "12px", 
                  border: errors.sem ? "1.5px solid #EF4444" : "1px solid #e2e8f0", 
                  boxShadow: errors.sem ? "0 0 0 1px #EF4444" : "none",
                  fontSize: "14px", 
                  background: "#f8fafc", 
                  transition: "all 0.2s", 
                  outline: "none" 
                }} 
                placeholder="e.g. 5" 
                value={assignForm.sem} 
                onChange={(e) => {
                  setAssignForm({...assignForm, sem: e.target.value});
                  if (errors.sem) setErrors(prev => ({ ...prev, sem: "" }));
                }} 
              />
              {errors.sem && (
                <span style={{ fontSize: "11.5px", color: "#DC2626", fontWeight: "600", marginTop: "4px", display: "block" }}>{errors.sem}</span>
              )}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Section *</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ 
                  width: "100%", 
                  padding: "12px 16px", 
                  borderRadius: "12px", 
                  border: errors.section ? "1.5px solid #EF4444" : "1px solid #e2e8f0", 
                  boxShadow: errors.section ? "0 0 0 1px #EF4444" : "none",
                  fontSize: "14px", 
                  background: "#f8fafc", 
                  transition: "all 0.2s", 
                  outline: "none" 
                }} 
                placeholder="e.g. A" 
                value={assignForm.section} 
                onChange={(e) => {
                  setAssignForm({...assignForm, section: e.target.value.toUpperCase()});
                  if (errors.section) setErrors(prev => ({ ...prev, section: "" }));
                }} 
              />
              {errors.section && (
                <span style={{ fontSize: "11.5px", color: "#DC2626", fontWeight: "600", marginTop: "4px", display: "block" }}>{errors.section}</span>
              )}
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary hoverable" 
            style={{ width: "100%", padding: "14px", borderRadius: "12px", fontSize: "14.5px", fontWeight: "700", background: "var(--primary)", border: "none", color: "#fff", transition: "all 0.25s", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <Plus size={18} /> Confirm Assignment
          </button>
        </form>
      </div>
    </div>
  );
}
