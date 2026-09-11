import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, Calendar, Star, ArrowRight, Activity, LayoutGrid, Trash2, AlertTriangle, X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Purge Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [purgeStudents, setPurgeStudents] = useState(false);
  const [purgeFaculty, setPurgeFaculty] = useState(false);
  const [purgeSessions, setPurgeSessions] = useState(false);
  const [purgeEntireDepartment, setPurgeEntireDepartment] = useState(false);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptId, setNewDeptId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptUsername, setNewDeptUsername] = useState("");
  const [newDeptPassword, setNewDeptPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await apiClient.get("/admin/department-summaries", { withCredentials: true });
      setDepartments(res.data);
    } catch (err) {
      console.error("Error loading departments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const drillDown = (dept_id) => {
    navigate(`/department-dashboard/${dept_id}`);
  };

  const openDeleteModal = (e, dept) => {
    e.stopPropagation(); // Prevent drillDown
    setDeptToDelete(dept);
    setConfirmText("");
    setPurgeStudents(false);
    setPurgeFaculty(false);
    setPurgeSessions(false);
    setPurgeEntireDepartment(false);
    setShowDeleteModal(true);
  };

  const handlePurgeData = async () => {
    if (confirmText !== deptToDelete.dept_id) return;
    if (!purgeStudents && !purgeFaculty && !purgeSessions && !purgeEntireDepartment) {
      toast.error("Please select at least one data category to purge.");
      return;
    }
    
    setIsDeleting(true);
    try {
      await apiClient.post(`/admin/department/${deptToDelete.dept_id}/purge`, {
        purgeStudents, purgeFaculty, purgeSessions, purgeEntireDepartment
      }, { withCredentials: true });
      toast.success(`Selected data purged for ${deptToDelete.dept_id}.`, { icon: '🧹' });
      setShowDeleteModal(false);
      loadDepartments();
    } catch (err) {
      console.error("Failed to purge data:", err);
      toast.error("Failed to purge data. Check server logs.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (e, dept) => {
    e.stopPropagation();
    const newStatus = dept.is_active === 1 ? 0 : 1;
    try {
      await apiClient.patch(`/admin/department/${dept.dept_id}/status`, { is_active: newStatus }, { withCredentials: true });
      toast.success(`${dept.dept_id} is now ${newStatus === 1 ? 'Active' : 'Inactive'}.`);
      loadDepartments();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptId || !newDeptName || !newDeptUsername) {
      setAddError("ID, Name, and Username are required");
      return;
    }

    setIsAdding(true);
    setAddError("");

    try {
      const payload = { 
        dept_id: newDeptId.toUpperCase(), 
        dept_name: newDeptName,
        username: newDeptUsername.toLowerCase()
      };
      if (newDeptPassword) payload.password = newDeptPassword; // Only send if provided

      const response = await apiClient.post("/department/add", payload, {
        withCredentials: true
      });

      const data = response.data;

      if (data.success) {
        toast.success("Department added successfully!");
        setShowAddModal(false);
        setNewDeptId("");
        setNewDeptName("");
        setNewDeptUsername("");
        setNewDeptPassword("");
        setShowPassword(false);
        loadDepartments(); // Refresh grid
      } else {
        setAddError(data.message || "Failed to add department");
      }
    } catch (err) {
      console.error(err);
      setAddError("Server error");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #E5E7EB", paddingBottom: "20px" }}>
        <div>
          <h1 style={{ color: "var(--navy)", margin: 0, fontSize: "28px", fontWeight: "700", letterSpacing: "-0.5px" }}>Departments Center</h1>
          <p style={{ color: "var(--text-muted)", margin: "8px 0 0 0", fontSize: "15px" }}>Monitor performance and manage all college departments.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddModal(true)}
          style={{ padding: "10px 20px", borderRadius: "8px", fontWeight: "600", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" }}
        >
          + Add Department
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
           <div style={{ width: "30px", height: "30px", border: "3px solid #E5E7EB", borderTopColor: "var(--navy)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
           Loading departments...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
          {departments.map(dept => {
            const rating = dept.avg_rating ? parseFloat(dept.avg_rating) : 0;
            const ratingPercent = rating > 0 ? (rating / 5) * 100 : 0;
            
            return (
              <div 
                key={dept.dept_id} 
                className="department-hover-card" 
                style={{ 
                  background: "linear-gradient(180deg, #ffffff 0%, #FAFAFA 100%)",
                  borderRadius: "20px",
                  border: "1px solid rgba(229, 231, 235, 0.8)",
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
                  overflow: "hidden", 
                  display: "flex", 
                  flexDirection: "column",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={() => drillDown(dept.dept_id)}
              >
                {/* Actions (Absolute positioned on card) */}
                <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", alignItems: "center", gap: "10px", zIndex: 10 }}>
                  
                  {/* Status Toggle Switch */}
                  <div 
                    onClick={(e) => handleToggleStatus(e, dept)}
                    style={{
                      width: "40px", height: "22px", borderRadius: "12px",
                      background: dept.is_active === 1 ? "#10B981" : "#E5E7EB",
                      position: "relative", cursor: "pointer", transition: "background 0.3s"
                    }}
                    title={dept.is_active === 1 ? "Deactivate Department" : "Activate Department"}
                  >
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
                      position: "absolute", top: "2px", left: dept.is_active === 1 ? "20px" : "2px",
                      transition: "left 0.3s", boxShadow: "0 1px 2px rgba(0,0,0,0.2)"
                    }}></div>
                  </div>

                  <button 
                    className="nuke-btn"
                    onClick={(e) => openDeleteModal(e, dept)}
                    style={{
                      background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444",
                      width: "36px", height: "36px", borderRadius: "8px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                    title={`Purge Data in ${dept.dept_id}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div style={{ opacity: dept.is_active === 1 ? 1 : 0.4, transition: "opacity 0.3s", filter: dept.is_active === 1 ? "none" : "grayscale(100%)", flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Header Section */}
                  <div style={{ padding: "24px 24px 20px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingRight: "100px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ 
                      width: "56px", height: "56px", 
                      borderRadius: "16px", 
                      background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", 
                      color: "#ffffff", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.3)"
                    }}>
                      <LayoutGrid size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--navy)", letterSpacing: "-0.3px", lineHeight: "1.2" }}>
                        {dept.dept_name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                        <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500" }}>ID: {dept.dept_id}</span>
                        {dept.active_sessions > 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#059669", background: "#D1FAE5", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                            <Activity size={12} /> Active
                          </span>
                        )}
                        {dept.is_active === 0 && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#EF4444", background: "#FEE2E2", padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                            <AlertTriangle size={12} /> Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Metrics Section */}
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  {/* Rating Progress Bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Star size={14} color="#F59E0B" fill="#F59E0B" /> Average Rating
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--navy)" }}>{rating > 0 ? rating.toFixed(2) : "N/A"}</span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#F3F4F6", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ 
                        width: `${ratingPercent}%`, 
                        height: "100%", 
                        background: ratingPercent >= 80 ? "#10B981" : ratingPercent >= 60 ? "#F59E0B" : "#EF4444",
                        borderRadius: "4px",
                        transition: "width 1s ease-out"
                      }}></div>
                    </div>
                  </div>

                  {/* Premium Grid Stats */}
                  <div className="dash-grid-3" style={{ gap: "10px" }}>
                    <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: "12px", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "background 0.2s", cursor: "default" }} className="stat-chip">
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>
                        <Users size={14} color="#6B7280" /> Students
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--navy)", letterSpacing: "-0.5px" }}>{dept.student_count || 0}</span>
                    </div>
                    
                    <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: "12px", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "background 0.2s", cursor: "default" }} className="stat-chip">
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>
                        <BookOpen size={14} color="#6B7280" /> Faculty
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--navy)", letterSpacing: "-0.5px" }}>{dept.faculty_count || 0}</span>
                    </div>
                    
                    <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: "12px", padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", transition: "background 0.2s", cursor: "default" }} className="stat-chip">
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)", fontSize: "12px", fontWeight: "600" }}>
                        <Calendar size={14} color="#6B7280" /> Sessions
                      </span>
                      <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--navy)", letterSpacing: "-0.5px" }}>{dept.active_sessions || 0}</span>
                    </div>
                  </div>
                  
                </div>

                {/* Premium Footer Action */}
                <div style={{ padding: "16px 24px", background: "rgba(248, 250, 252, 0.7)", backdropFilter: "blur(4px)", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background 0.2s" }} className="card-footer">
                   <span style={{ fontSize: "14px", fontWeight: "600", color: "#3B82F6", display: "flex", alignItems: "center", gap: "8px" }}>Open Dashboard</span>
                   <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} className="drill-arrow-container">
                     <ArrowRight size={16} color="#3B82F6" className="drill-arrow" />
                   </div>
                </div>
                
                </div> {/* End Opacity Wrapper */}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= PURGE DATA MODAL ================= */}
      {showDeleteModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: "500px", borderRadius: "16px", padding: "30px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative"
          }}>
            <button onClick={() => setShowDeleteModal(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={20} />
            </button>
            
            <div style={{ width: "48px", height: "48px", background: "#FEF2F2", color: "#EF4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Trash2 size={24} />
            </div>

            <h2 style={{ margin: "0 0 10px 0", color: "var(--navy)", fontSize: "20px" }}>Purge Data in {deptToDelete?.dept_name}</h2>
            <p style={{ margin: "0 0 20px 0", color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.5" }}>
              Select the data categories you want to permanently delete. The Department profile and login credentials will <strong>not</strong> be deleted.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px", background: "#F9FAFB", padding: "16px", borderRadius: "8px", border: "1px solid #E5E7EB" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: purgeEntireDepartment ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", color: purgeEntireDepartment ? "#9CA3AF" : "var(--navy)", opacity: purgeEntireDepartment ? 0.5 : 1 }}>
                <input type="checkbox" disabled={purgeEntireDepartment} checked={purgeStudents} onChange={(e) => setPurgeStudents(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#EF4444" }} />
                Purge all Students (and their feedback history)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: purgeEntireDepartment ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", color: purgeEntireDepartment ? "#9CA3AF" : "var(--navy)", opacity: purgeEntireDepartment ? 0.5 : 1 }}>
                <input type="checkbox" disabled={purgeEntireDepartment} checked={purgeFaculty} onChange={(e) => setPurgeFaculty(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#EF4444" }} />
                Purge all Faculty & Course Assignments
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: purgeEntireDepartment ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "500", color: purgeEntireDepartment ? "#9CA3AF" : "var(--navy)", opacity: purgeEntireDepartment ? 0.5 : 1 }}>
                <input type="checkbox" disabled={purgeEntireDepartment} checked={purgeSessions} onChange={(e) => setPurgeSessions(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#EF4444" }} />
                Purge all Active & Closed Feedback Sessions
              </label>
              <hr style={{ border: "none", borderTop: "1px solid #E5E7EB", margin: "4px 0" }} />
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", fontWeight: "700", color: "#B91C1C" }}>
                <input type="checkbox" checked={purgeEntireDepartment} onChange={(e) => {
                  setPurgeEntireDepartment(e.target.checked);
                  if (e.target.checked) {
                    setPurgeStudents(false);
                    setPurgeFaculty(false);
                    setPurgeSessions(false);
                  }
                }} style={{ width: "16px", height: "16px", accentColor: "#B91C1C" }} />
                HARD DELETE: Destroy entire department and all infrastructure permanently
              </label>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--navy)", marginBottom: "8px" }}>
                Type <span style={{ color: "#EF4444", userSelect: "none" }}>{deptToDelete?.dept_id}</span> to confirm purge
              </label>
              <input 
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={deptToDelete?.dept_id}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: "10px 16px", background: "#F3F4F6", color: "var(--navy)", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handlePurgeData}
                disabled={confirmText !== deptToDelete?.dept_id || isDeleting || (!purgeStudents && !purgeFaculty && !purgeSessions && !purgeEntireDepartment)}
                style={{ 
                  padding: "10px 16px", 
                  background: purgeEntireDepartment ? "#B91C1C" : "#EF4444", 
                  color: "#fff", 
                  border: "none", 
                  borderRadius: "8px", 
                  fontWeight: "600", 
                  cursor: (confirmText !== deptToDelete?.dept_id || isDeleting || (!purgeStudents && !purgeFaculty && !purgeSessions && !purgeEntireDepartment)) ? "not-allowed" : "pointer",
                  opacity: (confirmText !== deptToDelete?.dept_id || isDeleting || (!purgeStudents && !purgeFaculty && !purgeSessions && !purgeEntireDepartment)) ? 0.5 : 1
                }}
              >
                {isDeleting ? "Purging..." : purgeEntireDepartment ? "HARD DELETE DEPARTMENT" : "Purge Selected Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD DEPARTMENT MODAL ================= */}
      {showAddModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#fff", width: "100%", maxWidth: "450px", borderRadius: "16px", padding: "30px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative"
          }}>
            <button onClick={() => { setShowAddModal(false); setAddError(""); setShowPassword(false); }} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={20} />
            </button>
            
            <h2 style={{ margin: "0 0 20px 0", color: "var(--navy)", fontSize: "20px" }}>Add New Department</h2>

            <form onSubmit={handleAddDepartment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Department ID (e.g. CSE)</label>
                <input 
                  type="text"
                  value={newDeptId}
                  onChange={(e) => setNewDeptId(e.target.value)}
                  placeholder="Enter ID"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Department Name</label>
                <input 
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Enter full name"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Login Username</label>
                <input 
                  type="text"
                  value={newDeptUsername}
                  onChange={(e) => setNewDeptUsername(e.target.value)}
                  placeholder="e.g. cse_hod"
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)" }}>Login Password (Optional)</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={newDeptPassword}
                    onChange={(e) => setNewDeptPassword(e.target.value)}
                    placeholder="Defaults to 'Dept@123'"
                    style={{ width: "100%", padding: "12px", paddingRight: "40px", borderRadius: "8px", border: "1px solid #E5E7EB", outline: "none", fontSize: "14px" }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {addError && <p style={{ color: "#EF4444", margin: 0, fontSize: "13px" }}>{addError}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddError(""); setShowPassword(false); }}
                  style={{ padding: "10px 16px", background: "#F3F4F6", color: "var(--navy)", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding}
                  style={{ padding: "10px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: isAdding ? "not-allowed" : "pointer", opacity: isAdding ? 0.7 : 1 }}
                >
                  {isAdding ? "Adding..." : "Add Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .department-hover-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.1), 0 10px 15px -5px rgba(0, 0, 0, 0.04) !important;
          border-color: #93C5FD !important;
        }
        .department-hover-card:hover .drill-arrow {
          transform: translateX(4px);
          color: #1D4ED8 !important;
        }
        .department-hover-card:hover .drill-arrow-container {
          background: #DBEAFE !important;
        }
        .department-hover-card:hover .card-footer {
          background: rgba(239, 246, 255, 0.9) !important;
        }
        .stat-chip:hover {
          background: #F1F5F9 !important;
          transform: scale(1.02);
        }
        .nuke-btn:hover {
          background: #EF4444 !important;
          color: #ffffff !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
