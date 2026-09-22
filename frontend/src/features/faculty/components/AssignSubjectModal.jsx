import { Plus, BookOpen } from "lucide-react";

export default function AssignSubjectModal({ 
  selectedFaculty, 
  showAssignModal, 
  setShowAssignModal, 
  departmentCourses, 
  assignForm, 
  setAssignForm, 
  handleAssignSubmit 
}) {
  if (!showAssignModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowAssignModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "450px", padding: "40px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px var(--focus-ring)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", border: "1px solid var(--focus-ring)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h3 className="title-medium text-gradient" style={{ margin: 0, fontSize: "24px" }}>Assign Subject</h3>
            <p style={{ margin: "6px 0 0 0", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>For {selectedFaculty.name}</p>
          </div>
          <button 
            className="btn" 
            onClick={() => setShowAssignModal(false)} 
            style={{ width: "36px", height: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", border: "none", borderRadius: "50%", color: "var(--text-secondary)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-light)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.transform = "rotate(0deg)"; }}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleAssignSubmit} className="flex-col gap-md">
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}><BookOpen size={14} color="var(--primary)"/> Course Module</label>
            <select 
              className="form-input" 
              style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", background: "#f8fafc", transition: "all 0.2s", cursor: "pointer", outline: "none" }} 
              value={assignForm.courseCode} 
              onChange={(e) => setAssignForm({...assignForm, courseCode: e.target.value})} 
              onFocus={(e) => { e.currentTarget.style.border = "1px solid var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
              onBlur={(e) => { e.currentTarget.style.border = "1px solid #e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
              required
            >
              <option value="">Select Course...</option>
              {departmentCourses.map(c => <option key={c.course_id} value={c.course_code}>{c.course_code} — {c.course_name} — Sem {c.sem}</option>)}
            </select>
          </div>
          
          <div style={{ display: "flex", gap: "20px", marginBottom: "32px" }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Semester</label>
              <input 
                type="number" 
                className="form-input" 
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", background: "#f8fafc", transition: "all 0.2s", outline: "none" }} 
                placeholder="e.g. 5" 
                value={assignForm.sem} 
                onChange={(e) => setAssignForm({...assignForm, sem: e.target.value})} 
                onFocus={(e) => { e.currentTarget.style.border = "1px solid var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid #e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Section</label>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", background: "#f8fafc", transition: "all 0.2s", outline: "none" }} 
                placeholder="e.g. A" 
                value={assignForm.section} 
                onChange={(e) => setAssignForm({...assignForm, section: e.target.value.toUpperCase()})} 
                onFocus={(e) => { e.currentTarget.style.border = "1px solid var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid #e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                required 
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary hoverable" 
            style={{ width: "100%", padding: "16px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", background: "linear-gradient(to right, var(--primary), var(--primary))", border: "none", color: "#fff", transition: "all 0.3s", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px var(--focus-ring)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <Plus size={18} /> Confirm Assignment
          </button>
        </form>
      </div>
    </div>
  );
}
