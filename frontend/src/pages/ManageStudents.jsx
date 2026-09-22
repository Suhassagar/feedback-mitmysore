import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { ArrowLeft, Upload, Trash2, Plus, Search, Mail, Users, Filter, CheckSquare, Square, X } from "lucide-react";
import BulkUploadModal from "../components/BulkUploadModal";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDepartmentName } from "../hooks/useDepartmentName";

function ManageStudents() {
  const { dept_id } = useParams();
  const navigate = useNavigate();
  const { loadAnalytics } = useAnalytics(dept_id);
  const deptName = useDepartmentName(dept_id);

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Single student form states
  const [newStudentUsn, setNewStudentUsn] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentSection, setNewStudentSection] = useState("");
  
  // Navigation & filtering states
  const [selectedSem, setSelectedSem] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("all");

  // Reset selection & filters when changing semester
  useEffect(() => {
    setSelectedStudents([]);
    setSearchTerm("");
    setSelectedSectionFilter("all");
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
    if (!newStudentUsn.trim() || !newStudentName.trim() || !newStudentSection.trim()) {
      return toast.error("Please fill USN, Name, and Section");
    }
    
    try {
      const payload = {
        dept_id,
        students: [{
          usn: newStudentUsn.trim().toUpperCase(),
          name: newStudentName.trim(),
          email: newStudentEmail ? newStudentEmail.trim().toLowerCase() : null,
          sem: parseInt(selectedSem, 10),
          section: newStudentSection.trim().toUpperCase()
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

  // Filter students by semester
  const semesterStudents = useMemo(() => {
    if (!selectedSem) return [];
    return students.filter(s => parseInt(s.sem, 10) === parseInt(selectedSem, 10));
  }, [students, selectedSem]);

  // Extract unique sections for filter pills
  const availableSections = useMemo(() => {
    const sections = new Set();
    semesterStudents.forEach(s => {
      if (s.section) sections.add(String(s.section).trim().toUpperCase());
    });
    return Array.from(sections).sort();
  }, [semesterStudents]);

  // Filter students by search term and section
  const filteredStudents = useMemo(() => {
    return semesterStudents.filter(s => {
      const matchesSection = selectedSectionFilter === "all" || String(s.section).trim().toUpperCase() === selectedSectionFilter;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || 
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.usn && s.usn.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term));
      return matchesSection && matchesSearch;
    });
  }, [semesterStudents, selectedSectionFilter, searchTerm]);

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
      <div className="manage-students-wrapper" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
        
        <style>
          {`
            .manage-students-wrapper {
              max-width: 1100px;
              margin: 0 auto;
              padding: 0 4px;
            }
            .sem-grid-container {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              width: 100%;
            }
            .student-form-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 16px;
              align-items: flex-end;
            }
            .student-actions-row {
              display: flex;
              gap: 10px;
            }
            .student-desktop-view {
              display: block;
            }
            .student-mobile-view {
              display: none;
            }
            .student-card-item {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 14px;
              transition: all 0.2s ease;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .student-card-item.selected {
              border-color: #3b82f6;
              background-color: #eff6ff;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
            }
            .filter-pill {
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              border: 1px solid #e2e8f0;
              background: #ffffff;
              color: #475569;
              transition: all 0.2s;
              white-space: nowrap;
            }
            .filter-pill.active {
              background: var(--primary);
              color: #ffffff;
              border-color: var(--primary);
              box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
            }
            @media (max-width: 768px) {
              .sem-grid-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
              }
              .student-desktop-view {
                display: none !important;
              }
              .student-mobile-view {
                display: flex !important;
                flex-direction: column;
                gap: 10px;
              }
              .student-form-grid {
                grid-template-columns: 1fr;
                gap: 12px;
              }
              .student-actions-row {
                flex-direction: column;
              }
              .student-actions-row button {
                width: 100% !important;
                justify-content: center !important;
              }
              .page-header-title {
                font-size: 20px !important;
              }
              .header-controls-bar {
                flex-direction: column !important;
                align-items: stretch !important;
              }
              .header-controls-bar > * {
                width: 100% !important;
              }
              .search-filter-row {
                flex-direction: column !important;
              }
            }
          `}
        </style>

        {/* HEADER SECTION */}
        <div style={{ marginBottom: "24px" }}>
          {selectedSem && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <button 
                onClick={() => setSelectedSem(null)} 
                className="btn"
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px", 
                  padding: "8px 14px", 
                  borderRadius: "8px",
                  fontSize: "13px", 
                  fontWeight: "600",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  color: "var(--navy)"
                }}
              >
                <ArrowLeft size={16} /> All Semesters
              </button>
              <span style={{ color: "#94a3b8", fontSize: "14px" }}>/</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--navy)" }}>Semester {selectedSem}</span>
            </div>
          )}

          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <h2 className="title-large text-gradient page-header-title" style={{ margin: "0 0 6px 0" }}>
              {selectedSem ? `Semester ${selectedSem} Student Roster` : "Select Semester"}
            </h2>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
              Department of <strong style={{ color: "var(--navy)" }}>{deptName || dept_id}</strong>
            </p>
          </div>
        </div>

        {/* SEMESTER GRID VIEW (When no semester is selected) */}
        {!selectedSem && (
          <div className="sem-grid-container">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const count = students.filter(s => parseInt(s.sem, 10) === sem).length;
              return (
                <div 
                  key={sem} 
                  className="card hoverable" 
                  onClick={() => setSelectedSem(sem)}
                  style={{ 
                    padding: "24px 16px", 
                    textAlign: "center", 
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                    background: "linear-gradient(145deg, #ffffff, #f8fafc)",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                  }}
                >
                  <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--navy)" }}>
                    Sem {sem}
                  </div>
                  <div style={{ 
                    fontSize: "13px", 
                    fontWeight: "600",
                    color: count > 0 ? "var(--primary)" : "#64748b", 
                    backgroundColor: count > 0 ? "#eff6ff" : "#f1f5f9", 
                    padding: "4px 12px", 
                    borderRadius: "20px",
                    border: count > 0 ? "1px solid #bfdbfe" : "1px solid transparent"
                  }}>
                    {count} Students
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ROSTER VIEW (When semester is selected) */}
        {selectedSem && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* INLINE ADD STUDENT PANEL */}
            <div className="card" style={{ padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--navy)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plus size={18} color="var(--primary)" /> Add Single Student
                </h3>
              </div>

              <div className="student-form-grid">
                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>USN *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                    placeholder="e.g. 4MH21CS001" 
                    value={newStudentUsn} 
                    onChange={(e) => setNewStudentUsn(e.target.value.toUpperCase())} 
                  />
                </div>

                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                    placeholder="e.g. Rahul Sharma" 
                    value={newStudentName} 
                    onChange={(e) => setNewStudentName(e.target.value)} 
                  />
                </div>

                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                    placeholder="student@mitmysore.edu" 
                    value={newStudentEmail} 
                    onChange={(e) => setNewStudentEmail(e.target.value)} 
                  />
                </div>

                <div className="flex-col gap-xs">
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Section *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1" }} 
                    placeholder="e.g. A or B" 
                    value={newStudentSection} 
                    onChange={(e) => setNewStudentSection(e.target.value.toUpperCase())} 
                  />
                </div>

                <div className="student-actions-row">
                  <button 
                    className="btn hoverable" 
                    style={{ 
                      padding: "10px 20px", 
                      height: "42px", 
                      background: "var(--primary)", 
                      color: "#ffffff", 
                      borderRadius: "8px", 
                      border: "none", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px", 
                      fontWeight: "600",
                      flex: 1,
                      whiteSpace: "nowrap"
                    }} 
                    onClick={handleAddSingleStudent}
                  >
                    <Plus size={16} strokeWidth={2.5} /> Add Student
                  </button>

                  <button 
                    className="btn" 
                    style={{ 
                      padding: "10px 16px", 
                      height: "42px", 
                      border: "1px solid #cbd5e1", 
                      background: "#ffffff", 
                      color: "var(--navy)", 
                      borderRadius: "8px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      fontWeight: "600",
                      whiteSpace: "nowrap"
                    }} 
                    onClick={() => setShowBulkModal(true)}
                  >
                    <Upload size={16} /> Bulk Excel
                  </button>
                </div>
              </div>
            </div>

            {/* SEARCH & FILTERS CONTROLS BAR */}
            <div className="card" style={{ padding: "16px 20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
              <div className="search-filter-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                
                {/* Search Input */}
                <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
                  <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input 
                    type="text" 
                    placeholder="Search by USN, Name, or Email..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                      width: "100%", 
                      padding: "10px 36px 10px 38px", 
                      borderRadius: "8px", 
                      border: "1px solid #cbd5e1", 
                      fontSize: "14px",
                      outline: "none"
                    }}
                  />
                  {searchTerm && (
                    <X 
                      size={16} 
                      onClick={() => setSearchTerm("")} 
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", cursor: "pointer" }} 
                    />
                  )}
                </div>

                {/* Section Filter Pills */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "4px", maxWidth: "100%" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Filter size={14} /> Section:
                  </span>
                  <button 
                    className={`filter-pill ${selectedSectionFilter === "all" ? "active" : ""}`}
                    onClick={() => setSelectedSectionFilter("all")}
                  >
                    All ({semesterStudents.length})
                  </button>
                  {availableSections.map(sec => {
                    const count = semesterStudents.filter(s => String(s.section).toUpperCase() === sec).length;
                    return (
                      <button 
                        key={sec}
                        className={`filter-pill ${selectedSectionFilter === sec ? "active" : ""}`}
                        onClick={() => setSelectedSectionFilter(sec)}
                      >
                        Sec {sec} ({count})
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* BATCH ACTIONS ROW */}
              {selectedStudents.length > 0 && (
                <div style={{ 
                  marginTop: "16px", 
                  paddingTop: "14px", 
                  borderTop: "1px solid #e2e8f0", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  flexWrap: "wrap", 
                  gap: "10px",
                  background: "#fef2f2",
                  padding: "10px 14px",
                  borderRadius: "8px"
                }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#b91c1c" }}>
                    {selectedStudents.length} student{selectedStudents.length > 1 ? "s" : ""} selected
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      className="btn" 
                      style={{ padding: "6px 12px", fontSize: "12px", background: "#ffffff", border: "1px solid #fecaca", color: "#475569" }}
                      onClick={() => setSelectedStudents([])}
                    >
                      Clear
                    </button>
                    <button 
                      className="btn btn-delete" 
                      style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}
                      onClick={handleBulkDelete}
                    >
                      <Trash2 size={14} /> Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LIST / CARDS CONTAINER */}
            <div className="card" style={{ padding: "0", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              
              {loading ? (
                <div className="skeleton" style={{ height: "300px", width: "100%" }}></div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Users size={40} color="#94a3b8" style={{ marginBottom: "12px" }} />
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--navy)", fontSize: "16px" }}>No Students Found</h4>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    {searchTerm || selectedSectionFilter !== "all" 
                      ? "No students match your active filters. Try clearing your search." 
                      : `No registered students in Semester ${selectedSem}. Add them above or bulk upload.`}
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. DESKTOP TABLE VIEW (Visible on >= 768px) */}
                  <div className="student-desktop-view" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "14px 16px", width: "40px" }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                              checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>USN</th>
                          <th style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Name</th>
                          <th style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Email</th>
                          <th style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Section</th>
                          <th style={{ padding: "14px 16px", color: "#64748b", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s, idx) => {
                          const isSelected = selectedStudents.includes(s.usn);
                          return (
                            <tr 
                              key={s.usn} 
                              style={{ 
                                borderBottom: idx === filteredStudents.length - 1 ? "none" : "1px solid #f1f5f9", 
                                backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                transition: "background-color 0.15s ease"
                              }}
                              className="hoverable"
                            >
                              <td style={{ padding: "14px 16px" }}>
                                <input 
                                  type="checkbox" 
                                  style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                                  checked={isSelected}
                                  onChange={() => handleSelectStudent(s.usn)}
                                />
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <span style={{ background: "#f1f5f9", color: "#1e293b", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", fontFamily: "monospace", border: "1px solid #e2e8f0" }}>
                                  {s.usn}
                                </span>
                              </td>
                              <td style={{ padding: "14px 16px", fontWeight: "600", color: "var(--navy)" }}>{s.name}</td>
                              <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "13px" }}>
                                {s.email ? (
                                  <span style={{ color: "var(--primary)", fontWeight: "500" }}>{s.email}</span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "12px" }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "700", border: "1px solid #bbf7d0" }}>
                                  Sec {s.section}
                                </span>
                              </td>
                              <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                <button 
                                  className="btn btn-delete" 
                                  style={{ padding: "6px", height: "32px", width: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }} 
                                  onClick={() => handleDeleteStudent(s.usn)} 
                                  title="Delete Student"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. MOBILE CARD VIEW (Visible on < 768px) */}
                  <div className="student-mobile-view" style={{ padding: "12px" }}>
                    
                    {/* Mobile Select All Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px 12px 4px", borderBottom: "1px solid #f1f5f9" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#475569", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                          checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                          onChange={handleSelectAll}
                        />
                        Select All ({filteredStudents.length})
                      </label>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Showing {filteredStudents.length} students
                      </span>
                    </div>

                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudents.includes(s.usn);
                      return (
                        <div 
                          key={s.usn}
                          className={`student-card-item ${isSelected ? "selected" : ""}`}
                          onClick={(e) => {
                            // Don't toggle checkbox if clicking the delete button
                            if (e.target.closest('.delete-action-btn')) return;
                            handleSelectStudent(s.usn);
                          }}
                        >
                          {/* Top Row: Checkbox + USN + Section + Delete */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input 
                                type="checkbox" 
                                style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                                checked={isSelected}
                                onChange={() => handleSelectStudent(s.usn)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span style={{ background: "#f1f5f9", color: "#1e293b", padding: "4px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", fontFamily: "monospace", border: "1px solid #e2e8f0" }}>
                                {s.usn}
                              </span>
                              <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "700", border: "1px solid #bbf7d0" }}>
                                Sec {s.section}
                              </span>
                            </div>

                            <button 
                              className="btn btn-delete delete-action-btn"
                              style={{ padding: "6px", height: "32px", width: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(s.usn);
                              }}
                              title="Delete Student"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Middle Row: Student Name */}
                          <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--navy)", paddingLeft: "28px" }}>
                            {s.name}
                          </div>

                          {/* Bottom Row: Email */}
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: s.email ? "var(--primary)" : "#94a3b8", paddingLeft: "28px" }}>
                            <Mail size={13} color={s.email ? "var(--primary)" : "#94a3b8"} />
                            <span>{s.email || "No email registered"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
            if (loadAnalytics) loadAnalytics();
          }} 
        />
      )}
    </PageTransition>
  );
}

export default ManageStudents;
