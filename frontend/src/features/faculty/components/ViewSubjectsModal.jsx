import { BookOpen, Trash2 } from "lucide-react";

export default function ViewSubjectsModal({ 
  selectedFaculty, 
  showViewSubjectsModal, 
  setShowViewSubjectsModal, 
  assignedSubjects, 
  handleRemoveAssignedSubject 
}) {
  if (!showViewSubjectsModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowViewSubjectsModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "center", animation: "fadeIn 0.2s" }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: "550px", padding: "40px", borderRadius: "24px", background: "#ffffff", boxShadow: "0 25px 50px -12px var(--focus-ring)", animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)", maxHeight: "85vh", overflowY: "auto", border: "1px solid var(--focus-ring)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h3 className="title-medium text-gradient" style={{ margin: 0, fontSize: "24px" }}>Assigned Subjects</h3>
            <p style={{ margin: "6px 0 0 0", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500" }}>{selectedFaculty.name} • {selectedFaculty.position || "Faculty"}</p>
          </div>
          <button 
            className="btn" 
            onClick={() => setShowViewSubjectsModal(false)} 
            style={{ width: "36px", height: "36px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-light)", border: "none", borderRadius: "50%", color: "var(--text-secondary)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-light)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.transform = "rotate(0deg)"; }}
          >
            ✕
          </button>
        </div>
        
        <div className="flex-col" style={{ gap: "32px" }}>
          {Object.entries(assignedSubjects.reduce((acc, sub) => {
            if (!acc[sub.sem]) acc[sub.sem] = [];
            acc[sub.sem].push(sub);
            return acc;
          }, {})).sort(([a], [b]) => Number(a) - Number(b)).map(([sem, subjects]) => (
            <div key={sem} style={{ background: "rgba(248, 250, 252, 0.5)", padding: "20px", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
              
              <div style={{ fontSize: "16px", fontWeight: "800", color: "transparent", backgroundClip: "text", WebkitBackgroundClip: "text", backgroundImage: "linear-gradient(to right, var(--primary), var(--primary))", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ background: "var(--focus-ring)", padding: "6px", borderRadius: "8px" }}><BookOpen size={16} color="var(--primary)" /></div>
                Semester {sem}
              </div>

              <div className="flex-col" style={{ gap: "12px" }}>
                {subjects.map(sub => (
                  <div 
                    key={sub.course_code} 
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--focus-ring)", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)", transition: "all 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px var(--focus-ring)"; e.currentTarget.style.border = "1px solid var(--focus-ring)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.05)"; e.currentTarget.style.border = "1px solid var(--focus-ring)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "4px", height: "32px", background: "var(--primary)", borderRadius: "4px" }}></div>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{sub.course_name}</div>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px", fontWeight: "500" }}>{sub.course_code} • Section {sub.section}</div>
                      </div>
                    </div>
                    <button 
                      className="btn" 
                      onClick={() => handleRemoveAssignedSubject(sub.course_code)}
                      style={{ width: "36px", height: "36px", padding: 0, background: "rgba(239, 68, 68, 0.05)", color: "var(--red)", border: "1px solid transparent", borderRadius: "50%", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.border = "1px solid rgba(239, 68, 68, 0.3)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.border = "1px solid transparent"; }}
                      title="Remove Subject"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {assignedSubjects.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", background: "#f8fafc", borderRadius: "16px", border: "1px dashed #cbd5e1" }}>
              <BookOpen size={32} color="#cbd5e1" style={{ marginBottom: "12px" }} />
              <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-secondary)" }}>No subjects assigned yet</div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Click the Assign Subject button to get started.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
