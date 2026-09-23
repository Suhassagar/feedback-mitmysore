import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { 
  ArrowLeft, Upload, Trash2, Plus, Search, Mail, 
  Users, Filter, GraduationCap, X 
} from "lucide-react";
import BulkUploadModal from "../components/BulkUploadModal";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDepartmentName } from "../hooks/useDepartmentName";

function ManageStudents() {
  const { dept_id } = useParams();
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
      setLoading(true);
      const res = await apiClient.get(`/students/${dept_id}`, { withCredentials: true });
      setStudents(Array.isArray(res.data) ? res.data : (res.data?.data || []));
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
          section: newStudentSection.trim().toUpperCase(),
          dept_id
        }]
      };
      
      try {
        await apiClient.post(`/students/bulk`, payload, { withCredentials: true });
      } catch (err) {
        await apiClient.post(`/upload-students`, payload, { withCredentials: true });
      }

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
      await apiClient.delete(`/students/${encodeURIComponent(usn)}`, { withCredentials: true });
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
      <div className="manage-students-container">
        
        {/* Scoped Responsive CSS */}
        <style>
          {`
            .manage-students-container {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 16px;
              animation: fadeIn 0.3s ease;
            }

            .sem-grid-container {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              width: 100%;
            }
            .sem-card-item {
              padding: 22px 16px;
              cursor: pointer;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
              text-align: center;
            }

            .student-form-card {
              padding: 18px 20px;
            }
            .student-form-grid {
              display: flex;
              gap: 14px;
              align-items: flex-end;
              flex-wrap: wrap;
              width: 100%;
            }
            .student-form-actions {
              display: flex;
              gap: 10px;
            }

            .search-controls-wrapper {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
              flex-wrap: wrap;
            }
            .student-search-box {
              position: relative;
              width: 100%;
              max-width: 360px;
              display: flex;
              align-items: center;
              height: 38px;
            }
            .student-search-box input {
              width: 100%;
              height: 38px;
              padding: 8px 36px 8px 38px;
              border-radius: 20px;
              border: 1px solid var(--border-color);
              background: var(--bg-light);
              font-size: 13.5px;
              color: var(--text-primary);
              transition: all 0.2s ease;
              box-sizing: border-box;
            }
            .student-search-box input:focus {
              outline: none;
              border-color: var(--primary);
              box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
              background: #FFFFFF;
            }
            .student-search-box .student-search-icon {
              position: absolute;
              left: 14px;
              top: 50%;
              transform: translateY(-50%);
              color: var(--text-secondary);
              pointer-events: none;
            }
            .student-search-box .student-search-clear {
              position: absolute;
              right: 12px;
              top: 50%;
              transform: translateY(-50%);
              background: none;
              border: none;
              padding: 0;
              margin: 0;
              color: var(--text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .student-search-box .student-search-clear:hover {
              color: var(--text-primary);
            }
            .filter-pills-scroll {
              display: flex;
              align-items: center;
              gap: 8px;
              overflow-x: auto;
              max-width: 100%;
              padding-bottom: 2px;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
            }
            .filter-pills-scroll::-webkit-scrollbar {
              display: none;
            }
            .filter-pill {
              padding: 6px 14px;
              border-radius: var(--radius-badge);
              font-size: 13px;
              font-weight: 600;
              cursor: pointer;
              border: 1px solid var(--border-color);
              background: var(--card-bg);
              color: var(--text-secondary);
              transition: all 0.2s;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .filter-pill.active {
              background: var(--primary);
              color: #ffffff;
              border-color: var(--primary);
            }

            .student-desktop-view {
              display: block;
            }
            .student-mobile-view {
              display: none;
            }

            .student-card-item {
              background: var(--card-bg);
              border: 1px solid var(--border-color);
              border-radius: 12px;
              padding: 12px 14px;
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
            }
            .student-card-item.selected {
              border-color: var(--primary);
              background-color: rgba(37, 99, 235, 0.05);
            }

            @media (max-width: 900px) {
              .sem-grid-container {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
              }
            }

            @media (max-width: 768px) {
              .manage-students-container {
                gap: 12px !important;
              }
              .page-main-header {
                margin-bottom: 8px !important;
              }
              .page-main-title {
                font-size: 20px !important;
                margin-bottom: 2px !important;
              }
              .page-main-subtitle {
                font-size: 13px !important;
              }
              .breadcrumb-nav {
                margin-bottom: 6px !important;
                font-size: 13px !important;
              }

              .sem-grid-container {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 10px !important;
              }
              .sem-card-item {
                padding: 16px 10px !important;
                gap: 8px !important;
              }
              .sem-card-icon {
                width: 38px !important;
                height: 38px !important;
                border-radius: 10px !important;
              }
              .sem-card-title {
                font-size: 15px !important;
              }

              .student-form-card {
                padding: 14px !important;
              }
              .student-form-grid {
                display: grid !important;
                grid-template-columns: 2fr 1fr !important;
                gap: 10px !important;
              }
              .col-usn {
                grid-column: 1 / 2;
              }
              .col-section {
                grid-column: 2 / 3;
              }
              .col-name {
                grid-column: 1 / 3;
              }
              .col-email {
                grid-column: 1 / 3;
              }
              .student-form-actions {
                grid-column: 1 / 3;
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
                margin-top: 4px;
              }
              .student-form-actions button {
                width: 100% !important;
                justify-content: center !important;
                padding: 8px 12px !important;
                font-size: 13px !important;
                height: 38px !important;
              }

              .search-controls-wrapper {
                flex-direction: column !important;
                align-items: stretch !important;
                gap: 10px !important;
              }
              .student-search-box {
                max-width: 100% !important;
                width: 100% !important;
                flex: none !important;
              }
              .header-search {
                max-width: 100% !important;
                width: 100% !important;
              }

              .student-desktop-view {
                display: none !important;
              }
              .student-mobile-view {
                display: flex !important;
                flex-direction: column;
                gap: 8px !important;
                padding: 10px !important;
              }
            }
          `}
        </style>

        {/* BREADCRUMB NAVIGATION (When inside a semester) */}
        {selectedSem && (
          <div className="breadcrumb-nav" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span 
              onClick={() => setSelectedSem(null)} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "5px", 
                color: "var(--text-secondary)", 
                fontSize: "13px", 
                fontWeight: "600", 
                cursor: "pointer",
                transition: "color 0.2s" 
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft size={14} /> Student Roster
            </span>
            <span style={{ color: "var(--border-color)", fontSize: "13px" }}>/</span>
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
              Semester {selectedSem}
            </span>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="page-main-header" style={{ marginBottom: "16px" }}>
          <h2 className="title-large text-gradient page-main-title" style={{ margin: "0 0 4px 0" }}>
            {selectedSem ? `Semester ${selectedSem} Students` : "Student Roster"}
          </h2>
          <p className="page-main-subtitle" style={{ color: "var(--text-secondary)", margin: 0 }}>
            {selectedSem 
              ? `Department of ${deptName || dept_id} • Manage enrolled students and section assignments.` 
              : `Department of ${deptName || dept_id} • Select a semester to view and manage students.`}
          </p>
        </div>

        {/* SEMESTER GRID VIEW (When no semester is selected) */}
        {!selectedSem && (
          <div className="sem-grid-container">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const count = students.filter(s => parseInt(s.sem, 10) === sem).length;
              return (
                <div 
                  key={sem} 
                  className="card hoverable sem-card-item" 
                  onClick={() => setSelectedSem(sem)}
                >
                  <div className="sem-card-icon" style={{ 
                    width: "44px", 
                    height: "44px", 
                    borderRadius: "12px", 
                    background: count > 0 ? "rgba(37, 99, 235, 0.1)" : "var(--hover-bg)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    color: count > 0 ? "var(--primary)" : "var(--text-secondary)"
                  }}>
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h3 className="sem-card-title" style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: "700", color: "var(--text-primary)" }}>
                      Semester {sem}
                    </h3>
                    <span style={{ 
                      display: "inline-block",
                      fontSize: "12px", 
                      fontWeight: "600",
                      color: count > 0 ? "var(--primary)" : "var(--text-secondary)", 
                      backgroundColor: count > 0 ? "rgba(37, 99, 235, 0.08)" : "var(--hover-bg)", 
                      padding: "2px 10px", 
                      borderRadius: "var(--radius-badge)"
                    }}>
                      {count} Students
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ROSTER VIEW (When semester is selected) */}
        {selectedSem && (
          <>
            {/* INLINE ADD STUDENT PANEL */}
            <div className="card student-form-card">
              <div className="student-form-grid">
                <div className="col-usn flex-col gap-sm" style={{ flex: "1 1 130px", minWidth: "120px" }}>
                  <label className="field-label" style={{ fontSize: "12px" }}>USN *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "8px 12px", fontSize: "13px" }} 
                    placeholder="e.g. 4MH21CS001" 
                    value={newStudentUsn} 
                    onChange={(e) => setNewStudentUsn(e.target.value.toUpperCase())} 
                  />
                </div>

                <div className="col-section flex-col gap-sm" style={{ flex: "0 1 90px", minWidth: "70px" }}>
                  <label className="field-label" style={{ fontSize: "12px" }}>Section *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "8px 12px", fontSize: "13px" }} 
                    placeholder="A, B..." 
                    value={newStudentSection} 
                    onChange={(e) => setNewStudentSection(e.target.value.toUpperCase())} 
                  />
                </div>
                
                <div className="col-name flex-col gap-sm" style={{ flex: "2 1 170px", minWidth: "150px" }}>
                  <label className="field-label" style={{ fontSize: "12px" }}>Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ padding: "8px 12px", fontSize: "13px" }} 
                    placeholder="e.g. Rahul Sharma" 
                    value={newStudentName} 
                    onChange={(e) => setNewStudentName(e.target.value)} 
                  />
                </div>

                <div className="col-email flex-col gap-sm" style={{ flex: "2 1 180px", minWidth: "160px" }}>
                  <label className="field-label" style={{ fontSize: "12px" }}>Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    style={{ padding: "8px 12px", fontSize: "13px" }} 
                    placeholder="student@example.com" 
                    value={newStudentEmail} 
                    onChange={(e) => setNewStudentEmail(e.target.value)} 
                  />
                </div>

                <div className="student-form-actions">
                  <button 
                    className="btn" 
                    style={{ 
                      padding: "8px 16px", 
                      whiteSpace: "nowrap", 
                      height: "38px", 
                      border: "1px solid var(--border-color)", 
                      background: "transparent", 
                      color: "var(--text-primary)", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      fontSize: "13px"
                    }} 
                    onClick={() => setShowBulkModal(true)}
                  >
                    <Upload size={15} /> Bulk Excel
                  </button>
                  <button 
                    className="btn hoverable" 
                    style={{ 
                      padding: "8px 20px", 
                      height: "38px", 
                      background: "var(--focus-ring)", 
                      color: "var(--primary)", 
                      border: "none", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "6px", 
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      fontSize: "13px"
                    }} 
                    onClick={handleAddSingleStudent}
                  >
                    <Plus size={15} strokeWidth={2.5} /> Add Student
                  </button>
                </div>
              </div>
            </div>

            {/* SEARCH & FILTERS CONTROLS BAR */}
            <div className="search-controls-wrapper">
              {/* Search Bar */}
              <div className="student-search-box">
                <Search size={16} className="student-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search by USN, Name, or Email..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                {searchTerm && (
                  <button 
                    type="button" 
                    className="student-search-clear" 
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Section Filter Pills */}
              <div className="filter-pills-scroll">
                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  <Filter size={13} /> Section:
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

            {/* BATCH ACTION BAR (When items are checked) */}
            {selectedStudents.length > 0 && (
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                gap: "10px", 
                padding: "10px 16px", 
                borderRadius: "var(--radius-btn)", 
                background: "#FEF2F2", 
                border: "1px solid #FECACA",
                flexWrap: "wrap"
              }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--danger)" }}>
                  {selectedStudents.length} student{selectedStudents.length > 1 ? "s" : ""} selected
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn" 
                    style={{ padding: "5px 12px", fontSize: "12px", background: "white", border: "1px solid #FECACA", color: "var(--text-secondary)" }}
                    onClick={() => setSelectedStudents([])}
                  >
                    Clear
                  </button>
                  <button 
                    className="btn btn-delete" 
                    style={{ padding: "5px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
                    onClick={handleBulkDelete}
                  >
                    <Trash2 size={14} /> Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* LIST / CARDS CONTAINER */}
            <div className="card" style={{ padding: "0", overflow: "hidden" }}>
              
              {loading ? (
                <div className="skeleton" style={{ height: "220px", width: "100%" }}></div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
                  <Users size={36} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: "10px" }} />
                  <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)", fontSize: "15px" }}>No Students Found</h4>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    {searchTerm || selectedSectionFilter !== "all" 
                      ? "No students match your active filters." 
                      : `No registered students in Semester ${selectedSem}. Add them above or click Bulk Excel.`}
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. DESKTOP TABLE VIEW (Visible on >= 768px) */}
                  <div className="student-desktop-view" style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--hover-bg)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "12px 16px", width: "40px" }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                              checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>USN</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Name</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Section</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>Email</th>
                          <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s, idx) => {
                          const isSelected = selectedStudents.includes(s.usn);
                          return (
                            <tr 
                              key={s.usn} 
                              style={{ 
                                borderBottom: idx === filteredStudents.length - 1 ? "none" : "1px solid var(--border-color)", 
                                backgroundColor: isSelected ? "rgba(37, 99, 235, 0.05)" : "transparent",
                                transition: "background-color 0.15s ease"
                              }}
                              className="hoverable"
                            >
                              <td style={{ padding: "12px 16px" }}>
                                <input 
                                  type="checkbox" 
                                  style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                                  checked={isSelected}
                                  onChange={() => handleSelectStudent(s.usn)}
                                />
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ background: "var(--hover-bg)", color: "var(--text-primary)", padding: "3px 8px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", fontFamily: "monospace", border: "1px solid var(--border-color)" }}>
                                  {s.usn}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-primary)" }}>{s.name}</td>
                              <td style={{ padding: "12px 16px" }}>
                                <span style={{ background: "rgba(22, 163, 74, 0.1)", color: "var(--success)", padding: "2px 8px", borderRadius: "var(--radius-badge)", fontSize: "12px", fontWeight: "700" }}>
                                  Sec {s.section}
                                </span>
                              </td>
                              <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                                {s.email ? (
                                  <span style={{ color: "var(--primary)", fontWeight: "500" }}>{s.email}</span>
                                ) : (
                                  <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "12px", opacity: 0.6 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                <button 
                                  className="btn btn-delete" 
                                  style={{ padding: "6px", height: "30px", width: "30px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }} 
                                  onClick={() => handleDeleteStudent(s.usn)} 
                                  title="Delete Student"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* 2. MOBILE CARD VIEW (Visible on < 768px - Compact Native-App Design) */}
                  <div className="student-mobile-view">
                    
                    {/* Mobile Select All Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 4px 8px 4px", borderBottom: "1px solid var(--border-color)", marginBottom: "4px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
                          checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                          onChange={handleSelectAll}
                        />
                        Select All ({filteredStudents.length})
                      </label>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {filteredStudents.length} students
                      </span>
                    </div>

                    {filteredStudents.map((s) => {
                      const isSelected = selectedStudents.includes(s.usn);
                      return (
                        <div 
                          key={s.usn}
                          className={`student-card-item ${isSelected ? "selected" : ""}`}
                          onClick={(e) => {
                            if (e.target.closest('.delete-action-btn')) return;
                            handleSelectStudent(s.usn);
                          }}
                        >
                          {/* Left: Checkbox */}
                          <input 
                            type="checkbox" 
                            style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer", flexShrink: 0 }}
                            checked={isSelected}
                            onChange={() => handleSelectStudent(s.usn)}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Center: Student Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "2px" }}>
                              <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {s.name}
                              </span>
                              <span style={{ background: "rgba(22, 163, 74, 0.1)", color: "var(--success)", padding: "1px 6px", borderRadius: "var(--radius-badge)", fontSize: "11px", fontWeight: "700" }}>
                                Sec {s.section}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                              <span style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--text-primary)" }}>{s.usn}</span>
                              {s.email && (
                                <>
                                  <span style={{ opacity: 0.5 }}>•</span>
                                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>{s.email}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right: Delete Action */}
                          <button 
                            className="btn btn-delete delete-action-btn"
                            style={{ padding: "6px", height: "32px", width: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", flexShrink: 0 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(s.usn);
                            }}
                            title="Delete Student"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
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
