import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { ArrowLeft, Upload, Trash2, Plus } from "lucide-react";
import BulkUploadModal from "../components/BulkUploadModal";
import { useAnalytics } from "../hooks/useAnalytics";

function ManageStudents() {
  const { dept_id } = useParams();
  const navigate = useNavigate();
  const { loadAnalytics } = useAnalytics(dept_id);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newStudentUsn, setNewStudentUsn] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("");
  const [selectedSem, setSelectedSem] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Reset selection when changing semester
  useEffect(() => {
    setSelectedStudents([]);
  }, [selectedSem]);

  useEffect(() => {
    fetchStudents();
  }, [dept_id]);

  const fetchStudents = async () => {
    try {
      const res = await apiClient.get(`/students/${dept_id}`, { withCredentials: true });
      setStudents(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingleStudent = async () => {
    if (!newStudentUsn || !newStudentName || !newStudentSection) {
      return toast.error("Please fill all fields to add a student");
    }
    
    try {
      const payload = {
        dept_id,
        students: [{
          usn: newStudentUsn,
          name: newStudentName,
          email: newStudentEmail,
          sem: selectedSem,
          section: newStudentSection
        }]
      };
      
      await apiClient.post(`/students/bulk`, payload, { withCredentials: true });
      toast.success("Student added successfully");
      setNewStudentUsn("");
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentSection("");
      fetchStudents();
      if (loadAnalytics) loadAnalytics();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Error adding student");
    }
  };

  const filteredStudents = students.filter(s => s.sem === selectedSem);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map(s => s.usn));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (usn) => {
    setSelectedStudents(prev => 
      prev.includes(usn) ? prev.filter(id => id !== usn) : [...prev, usn]
    );
  };

  const handleDeleteStudent = async (usn) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await apiClient.delete(`/students/${usn}`, { withCredentials: true });
      toast.success("Student deleted successfully");
      setSelectedStudents(prev => prev.filter(id => id !== usn));
      fetchStudents();
      if (loadAnalytics) loadAnalytics();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting student");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected students?`)) return;
    try {
      await apiClient.post(`/students/bulk-delete`, { usns: selectedStudents }, { withCredentials: true });
      toast.success(`${selectedStudents.length} students deleted successfully`);
      setSelectedStudents([]);
      fetchStudents();
      if (loadAnalytics) loadAnalytics();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting students in bulk");
    }
  };

  return (
    <PageTransition>
      <div className="flex-col" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "20px" }}>
          {selectedSem && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span 
                onClick={() => setSelectedSem(null)} 
                style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <ArrowLeft size={16} /> Semesters
              </span>
              <span style={{ color: "var(--border-color)" }}>/</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Student List</span>
            </div>
          )}
        </div>

        <h2 className="title-large text-gradient" style={{ textAlign: "center", marginBottom: "10px" }}>
          {selectedSem ? `Manage Students: Semester ${selectedSem}` : "Select Semester"}
        </h2>
        <p style={{ textAlign: "center", marginBottom: "30px", color: "var(--slate)" }}>
          Department: <strong style={{ color: "var(--navy)" }}>{dept_id.toUpperCase()}</strong>
        </p>

        {/* SEMESTER GRID VIEW */}
        {!selectedSem && (
          <div className="dash-grid-4" style={{ maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const count = students.filter(s => s.sem === sem).length;
              return (
                <div 
                  key={sem} 
                  className="card" 
                  onClick={() => setSelectedSem(sem)}
                  style={{ 
                    padding: "32px 20px", 
                    textAlign: "center", 
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                    background: "linear-gradient(145deg, #ffffff, #f8fafc)",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    borderRadius: "16px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-6px)'; 
                    e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                  }}
                >
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--navy)" }}>Semester {sem}</div>
                  <div style={{ fontSize: "14px", color: "var(--slate)", backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: "20px" }}>
                    {count} Students
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* UPLOAD AND LIST VIEW FOR SELECTED SEMESTER */}
        {selectedSem && (
          <div className="flex-col gap-lg" style={{ width: "100%", maxWidth: "1000px", margin: "0 auto" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
              <div className="flex-col gap-xs">
                <h3 className="title-medium" style={{ margin: 0 }}>Semester {selectedSem} Roster</h3>
                <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0", fontSize: "14px" }}>Manage registered students. Add them individually or bulk import.</p>
              </div>
            </div>

            {/* INLINE ADD STUDENT PANEL */}
            <div className="card" style={{ padding: "24px", marginBottom: "32px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", alignItems: "flex-end" }}>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>USN</label>
                  <input type="text" className="form-input" style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", transition: "all 0.2s" }} placeholder="e.g. 1BM20CS001" value={newStudentUsn} onChange={(e) => setNewStudentUsn(e.target.value.toUpperCase())} />
                </div>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
                  <input type="text" className="form-input" style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", transition: "all 0.2s" }} placeholder="John Doe" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                </div>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
                  <input type="email" className="form-input" style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", transition: "all 0.2s" }} placeholder="student@college.edu" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} />
                </div>
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Section</label>
                  <input type="text" className="form-input" style={{ padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", transition: "all 0.2s" }} placeholder="A" value={newStudentSection} onChange={(e) => setNewStudentSection(e.target.value.toUpperCase())} />
                </div>
                
                <div style={{ display: "flex", gap: "12px" }}>
                  <button className="btn hoverable" style={{ padding: "12px 24px", height: "46px", background: "var(--primary)", color: "white", borderRadius: "10px", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: "600", flex: 1, boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }} onClick={handleAddSingleStudent}>
                    <Plus size={18} strokeWidth={2.5} /> Add
                  </button>
                  <button className="btn" style={{ padding: "12px", height: "46px", border: "1px solid #e2e8f0", background: "white", color: "#475569", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onClick={() => setShowBulkModal(true)} title="Bulk Import" onMouseEnter={e => {e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = '#cbd5e1';}} onMouseLeave={e => {e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0';}}>
                    <Upload size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* LIST SECTION */}
            <div className="card flex-col gap-md" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", flexWrap: "wrap", gap: "12px" }}>
                <h3 className="title-medium" style={{ margin: 0 }}>Registered Students in Sem {selectedSem} ({filteredStudents.length})</h3>
                {selectedStudents.length > 0 && (
                  <button className="btn btn-delete" style={{ height: "36px", padding: "0 16px", fontSize: "13px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }} onClick={handleBulkDelete}>
                    <Trash2 size={16} /> Delete Selected ({selectedStudents.length})
                  </button>
                )}
              </div>
              
              {loading ? (
                <div className="skeleton" style={{ height: "400px", width: "100%" }}></div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "#f8fafc", borderRadius: "16px", border: "2px dashed #e2e8f0" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", color: "#94a3b8" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M16 11h6"/></svg>
                  </div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#1e293b", fontWeight: "700" }}>No Students Found</h4>
                  <p style={{ margin: 0, color: "#64748b", maxWidth: "300px", lineHeight: "1.5" }}>There are no registered students for Semester {selectedSem} yet. Add them individually or upload a roster.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left", whiteSpace: "nowrap" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "16px", width: "40px" }}>
                          <input 
                            type="checkbox" 
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                            checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>USN</th>
                        <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Name</th>
                        <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Section</th>
                        <th style={{ padding: "16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s, idx) => (
                        <tr 
                          key={s.usn} 
                          style={{ 
                            borderBottom: idx === filteredStudents.length - 1 ? "none" : "1px solid #f1f5f9", 
                            backgroundColor: selectedStudents.includes(s.usn) ? "#eff6ff" : "#fff",
                            transition: "background-color 0.2s ease"
                          }}
                          onMouseEnter={(e) => { if (!selectedStudents.includes(s.usn)) e.currentTarget.style.backgroundColor = '#f8fafc' }}
                          onMouseLeave={(e) => { if (!selectedStudents.includes(s.usn)) e.currentTarget.style.backgroundColor = '#fff' }}
                        >
                          <td style={{ padding: "16px" }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                              checked={selectedStudents.includes(s.usn)}
                              onChange={() => handleSelectStudent(s.usn)}
                            />
                          </td>
                          <td style={{ padding: "16px" }}>
                            <span style={{ background: "#f1f5f9", color: "#334155", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", fontFamily: "monospace", border: "1px solid #e2e8f0" }}>
                              {s.usn}
                            </span>
                          </td>
                          <td style={{ padding: "16px", color: "#0f172a", fontWeight: "500" }}>{s.name}</td>
                          <td style={{ padding: "16px" }}>
                            <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", border: "1px solid #bbf7d0" }}>
                              Sec {s.section}
                            </span>
                          </td>
                          <td style={{ padding: "16px", textAlign: "right" }}>
                            <button 
                              className="btn btn-delete" 
                              style={{ padding: "8px", height: "auto", border: "1px solid transparent", background: "transparent", color: "#94a3b8", borderRadius: "8px", transition: "all 0.2s" }} 
                              onClick={() => handleDeleteStudent(s.usn)} 
                              title="Delete Student"
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {showBulkModal && (
        <BulkUploadModal 
          type="students" 
          dept_id={dept_id} 
          selectedSem={selectedSem}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchStudents();
            loadAnalytics();
          }} 
        />
      )}
    </PageTransition>
  );
}

export default ManageStudents;
