import { useState, useEffect, useRef } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, Calendar, Star, ArrowRight, Activity, LayoutGrid, Trash2,
  AlertTriangle, X, Eye, EyeOff, Camera, Upload, Sparkles, RefreshCw,
  Search, Plus, Building2, GraduationCap, CheckCircle2, SlidersHorizontal
} from "lucide-react";
import { toast } from "react-hot-toast";
import DepartmentAvatar from "../../components/ui/DepartmentAvatar";
import DepartmentLogoCropModal from "../../components/ui/DepartmentLogoCropModal";
import { invalidateDepartmentCache } from "../../hooks/useDepartmentName";

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

  // Logo & Branding state for New Department
  const [rawLogoFile, setRawLogoFile] = useState(null);
  const [croppedLogoData, setCroppedLogoData] = useState(null); // { file, previewUrl, brandColor }
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef(null);

  // Logo update for Existing Department
  const [deptForLogoUpdate, setDeptForLogoUpdate] = useState(null);
  const [existingRawFile, setExistingRawFile] = useState(null);
  const [showExistingCropModal, setShowExistingCropModal] = useState(false);
  const existingFileInputRef = useRef(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'

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
      const formData = new FormData();
      formData.append("dept_id", newDeptId.toUpperCase());
      formData.append("dept_name", newDeptName);
      formData.append("username", newDeptUsername.toLowerCase());
      if (newDeptPassword) formData.append("password", newDeptPassword);
      if (croppedLogoData?.file) {
        formData.append("logo", croppedLogoData.file);
      }

      const response = await apiClient.post("/department/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      const data = response.data;

      if (data.success) {
        toast.success("Department created with custom branding!");
        setShowAddModal(false);
        setNewDeptId("");
        setNewDeptName("");
        setNewDeptUsername("");
        setNewDeptPassword("");
        setShowPassword(false);
        setCroppedLogoData(null);
        setRawLogoFile(null);
        invalidateDepartmentCache();
        loadDepartments();
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

  const handleTriggerExistingLogo = (e, dept) => {
    e.stopPropagation();
    setDeptForLogoUpdate(dept);
    if (existingFileInputRef.current) {
      existingFileInputRef.current.value = "";
      existingFileInputRef.current.click();
    }
  };

  const handleExistingFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setExistingRawFile(file);
      setShowExistingCropModal(true);
    }
  };

  const handleExistingCropComplete = async (cropResult) => {
    if (!deptForLogoUpdate || !cropResult?.file) return;
    const toastId = toast.loading(`Uploading logo for ${deptForLogoUpdate.dept_id}...`);
    try {
      const formData = new FormData();
      formData.append("logo", cropResult.file);

      const res = await apiClient.post(`/department/${deptForLogoUpdate.dept_id}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true
      });

      if (res.data.success) {
        toast.success(`Logo updated for ${deptForLogoUpdate.dept_id}!`, { id: toastId });
        invalidateDepartmentCache();
        loadDepartments();
      } else {
        toast.error(res.data.message || "Failed to update logo", { id: toastId });
      }
    } catch (err) {
      console.error("Failed to update logo:", err);
      toast.error(err.response?.data?.message || "Failed to upload logo", { id: toastId });
    } finally {
      setDeptForLogoUpdate(null);
      setExistingRawFile(null);
      setShowExistingCropModal(false);
    }
  };

  const totalDepts = departments.length;
  const activeDepts = departments.filter(d => d.is_active === 1).length;
  const totalStudents = departments.reduce((acc, d) => acc + (parseInt(d.student_count) || 0), 0);
  const totalFaculty = departments.reduce((acc, d) => acc + (parseInt(d.faculty_count) || 0), 0);
  const ratedDepts = departments.filter(d => parseFloat(d.avg_rating) > 0);
  const collegeAvgRating = ratedDepts.length > 0 
    ? (ratedDepts.reduce((acc, d) => acc + parseFloat(d.avg_rating), 0) / ratedDepts.length).toFixed(2)
    : "N/A";

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = !searchQuery || 
      dept.dept_id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (dept.dept_name && dept.dept_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = statusFilter === "all" || 
      (statusFilter === "active" && dept.is_active === 1) || 
      (statusFilter === "inactive" && dept.is_active === 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1440px", margin: "0 auto", width: "100%" }}>
      {/* 1. Executive Page Header */}
      <div className="admin-dept-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px", borderBottom: "1px solid #E2E8F0", paddingBottom: "22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)" }}>
              <Building2 size={20} />
            </div>
            <h1 style={{ color: "#0F172A", margin: 0, fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>Departments Center</h1>
          </div>
          <p style={{ color: "#64748B", margin: 0, fontSize: "14.5px" }}>Monitor institutional performance, brand identity, and student feedback across all academic units.</p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddModal(true)}
          style={{ 
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px", 
            borderRadius: "10px", 
            fontWeight: "600", 
            fontSize: "14px",
            boxShadow: "0 6px 20px rgba(22, 163, 74, 0.3)",
            background: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
            border: "none"
          }}
        >
          <Plus size={18} /> Add New Department
        </button>
      </div>

      {/* 2. Executive KPI Overview Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#F0FDF4", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Divisions</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginTop: "2px" }}>{totalDepts}</div>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Units</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>{activeDepts} <span style={{ fontSize: "13px", fontWeight: "500", color: "#64748B" }}>/ {totalDepts}</span></div>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#F5F3FF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Students</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginTop: "2px" }}>{totalStudents.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Star size={22} fill="#D97706" />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Campus Rating Avg</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#0F172A", marginTop: "2px" }}>{collegeAvgRating} <span style={{ fontSize: "13px", fontWeight: "500", color: "#64748B" }}>/ 5.0</span></div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Command Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", background: "#FFFFFF", padding: "14px 20px", borderRadius: "16px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "280px", flex: "1 1 300px" }}>
          <Search size={18} color="#94A3B8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search departments by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              outline: "none",
              fontSize: "14px",
              background: "#F8FAFC",
              transition: "border 0.2s, background 0.2s"
            }}
            onFocus={(e) => { e.target.style.background = '#FFFFFF'; e.target.style.borderColor = '#16A34A'; }}
            onBlur={(e) => { e.target.style.background = '#F8FAFC'; e.target.style.borderColor = '#E2E8F0'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: "2px" }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: statusFilter === "all" ? "#0F172A" : "#F1F5F9",
              color: statusFilter === "all" ? "#FFFFFF" : "#64748B",
              transition: "all 0.2s"
            }}
          >
            All ({totalDepts})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: statusFilter === "active" ? "#059669" : "#F1F5F9",
              color: statusFilter === "active" ? "#FFFFFF" : "#64748B",
              transition: "all 0.2s"
            }}
          >
            Active ({activeDepts})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              background: statusFilter === "inactive" ? "#EF4444" : "#F1F5F9",
              color: statusFilter === "inactive" ? "#FFFFFF" : "#64748B",
              transition: "all 0.2s"
            }}
          >
            Inactive ({totalDepts - activeDepts})
          </button>
        </div>
      </div>

      {/* 4. Departments Grid */}
      {isLoading ? (
        <div style={{ padding: "80px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
           <div style={{ width: "36px", height: "36px", border: "3px solid #E2E8F0", borderTopColor: "#16A34A", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
           <span style={{ fontSize: "15px", fontWeight: "500" }}>Loading department roster & brand configurations...</span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px dashed #CBD5E1", padding: "60px 20px", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#F0FDF4", color: "#16A34A", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
            <Building2 size={28} />
          </div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#0F172A" }}>No departments found</h3>
          <p style={{ margin: "0 0 18px 0", color: "#64748B", fontSize: "14px" }}>No department matched your search or status filter criteria.</p>
          <button
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
            style={{ padding: "8px 16px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer", color: "#0F172A" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
          {filteredDepartments.map(dept => {
            const rating = dept.avg_rating ? parseFloat(dept.avg_rating) : 0;
            const ratingPercent = rating > 0 ? (rating / 5) * 100 : 0;
            
            return (
              <div 
                key={dept.dept_id} 
                className="department-hover-card" 
                style={{ 
                  background: "#FFFFFF",
                  borderRadius: "20px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.04)",
                  overflow: "hidden", 
                  display: "flex", 
                  flexDirection: "column",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  position: "relative"
                }}
                onClick={() => drillDown(dept.dept_id)}
              >
                {/* A. Dedicated Top Utility / Control Bar (Never overlaps title!) */}
                <div 
                  style={{ 
                    padding: "16px 20px 12px 20px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    borderBottom: "1px solid #F1F5F9",
                    background: "#FAFAFA"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Left: Department Code & Status Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span 
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#16A34A",
                        background: "#F0FDF4",
                        border: "1px solid #BBF7D0",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {dept.dept_id}
                    </span>

                    {dept.is_active === 1 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "#059669", background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
                        Active
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11.5px", color: "#EF4444", background: "#FEF2F2", border: "1px solid #FECACA", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EF4444" }} />
                        Inactive
                      </span>
                    )}

                    {dept.active_sessions > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", padding: "2px 6px", borderRadius: "6px", fontWeight: "600" }}>
                        <Activity size={11} /> {dept.active_sessions} Active {dept.active_sessions === 1 ? 'Session' : 'Sessions'}
                      </span>
                    )}
                  </div>

                  {/* Right: Actions Controls Cluster */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {/* Status Toggle Switch */}
                    <div 
                      onClick={(e) => handleToggleStatus(e, dept)}
                      style={{
                        width: "38px", height: "20px", borderRadius: "10px",
                        background: dept.is_active === 1 ? "#10B981" : "#CBD5E1",
                        position: "relative", cursor: "pointer", transition: "background 0.3s"
                      }}
                      title={dept.is_active === 1 ? "Click to Deactivate Department" : "Click to Activate Department"}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", background: "#fff",
                        position: "absolute", top: "2px", left: dept.is_active === 1 ? "20px" : "2px",
                        transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
                      }} />
                    </div>

                    {/* Camera / Logo Button */}
                    <button 
                      className="dept-action-btn camera-btn"
                      onClick={(e) => handleTriggerExistingLogo(e, dept)}
                      style={{
                        background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A",
                        width: "32px", height: "32px", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.2s"
                      }}
                      title={`Change Logo & Brand Theme for ${dept.dept_id}`}
                    >
                      <Camera size={15} />
                    </button>

                    {/* Purge / Delete Button */}
                    <button 
                      className="dept-action-btn nuke-btn"
                      onClick={(e) => openDeleteModal(e, dept)}
                      style={{
                        background: "#FEF2F2", border: "1px solid #FECACA", color: "#EF4444",
                        width: "32px", height: "32px", borderRadius: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", transition: "all 0.2s"
                      }}
                      title={`Purge Data in ${dept.dept_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* B. Main Identity Row (Avatar + Full Unconstrained Title) */}
                <div style={{ opacity: dept.is_active === 1 ? 1 : 0.6, transition: "opacity 0.3s", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <DepartmentAvatar
                        dept_id={dept.dept_id}
                        logo_url={dept.logo_url}
                        logo_lqip={dept.logo_lqip}
                        brand_color={dept.brand_color}
                        size={56}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{
                        margin: "0 0 5px 0",
                        fontSize: "16.5px",
                        fontWeight: 700,
                        color: "#0F172A",
                        letterSpacing: "-0.3px",
                        lineHeight: "1.35",
                        wordBreak: "break-word"
                      }}>
                        {dept.dept_name}
                      </h3>
                      <div style={{ fontSize: "12.5px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>Academic Department</span>
                        <span>•</span>
                        <span>MIT Mysore</span>
                      </div>
                    </div>
                  </div>

                  {/* C. Feedback Rating Bar */}
                  <div style={{ padding: "0 20px 16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12.5px", color: "#64748B", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" /> Average Rating
                      </span>
                      <span style={{ fontSize: "13.5px", fontWeight: "700", color: rating > 0 ? "#0F172A" : "#94A3B8" }}>
                        {rating > 0 ? `${rating.toFixed(2)} / 5.0` : "No ratings yet"}
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#F1F5F9", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ 
                        width: `${ratingPercent}%`, 
                        height: "100%", 
                        background: ratingPercent >= 80 ? "linear-gradient(90deg, #10B981, #059669)" : ratingPercent >= 60 ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #EF4444, #DC2626)",
                        borderRadius: "999px",
                        transition: "width 0.8s ease-out"
                      }} />
                    </div>
                  </div>

                  {/* D. Stats Overview (3 Column Frosted Chips) */}
                  <div style={{ padding: "0 20px 20px 20px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                    <div className="stat-chip" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.2s" }}>
                      <span style={{ color: "#64748B", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={13} color="#64748B" /> Students
                      </span>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.5px" }}>
                        {dept.student_count || 0}
                      </span>
                    </div>

                    <div className="stat-chip" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.2s" }}>
                      <span style={{ color: "#64748B", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <BookOpen size={13} color="#64748B" /> Faculty
                      </span>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.5px" }}>
                        {dept.faculty_count || 0}
                      </span>
                    </div>

                    <div className="stat-chip" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "12px", padding: "12px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.2s" }}>
                      <span style={{ color: "#64748B", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={13} color="#64748B" /> Sessions
                      </span>
                      <span style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", letterSpacing: "-0.5px" }}>
                        {dept.active_sessions || 0}
                      </span>
                    </div>
                  </div>

                  {/* E. Sleek Card Footer Action */}
                  <div 
                    className="card-footer"
                    style={{ 
                      marginTop: "auto",
                      padding: "14px 20px", 
                      background: "#F8FAFC", 
                      borderTop: "1px solid #E2E8F0", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      transition: "all 0.2s" 
                    }}
                  >
                     <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#16A34A", display: "flex", alignItems: "center", gap: "8px" }}>
                       Open Department Portal
                     </span>
                     <div 
                       style={{ 
                         width: "30px", 
                         height: "30px", 
                         borderRadius: "50%", 
                         background: "#F0FDF4", 
                         display: "flex", 
                         alignItems: "center", 
                         justifyContent: "center", 
                         transition: "all 0.2s" 
                       }} 
                       className="drill-arrow-container"
                     >
                       <ArrowRight size={15} color="#16A34A" className="drill-arrow" />
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
        <div className="modal-overlay" style={{
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
        <div className="modal-overlay" style={{
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

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Department Logo & Brand</span>
                  <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 400 }}>Optional (PNG, JPG, WebP)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setRawLogoFile(file);
                      setShowCropModal(true);
                    }
                  }}
                />

                {croppedLogoData?.previewUrl ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "#F8FAFC",
                      borderRadius: "12px",
                      border: `1.5px solid ${croppedLogoData.brandColor || '#3B82F6'}40`
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <img
                        src={croppedLogoData.previewUrl}
                        alt="Logo Preview"
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          boxShadow: `0 0 0 2px #FFF, 0 0 0 4px ${croppedLogoData.brandColor || '#3B82F6'}`
                        }}
                      />
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>
                          Framed & Theme Extracted
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background: croppedLogoData.brandColor
                            }}
                          />
                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#64748B" }}>
                            {croppedLogoData.brandColor}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (fileInputRef.current) fileInputRef.current.click();
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E1",
                          background: "#FFF",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "var(--navy)"
                        }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCroppedLogoData(null);
                          setRawLogoFile(null);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "none",
                          background: "#FEE2E2",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "#EF4444"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        setRawLogoFile(file);
                        setShowCropModal(true);
                      }
                    }}
                    style={{
                      border: "2px dashed #CBD5E1",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#F8FAFC",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#16A34A'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "#F0FDF4",
                          color: "#16A34A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Camera size={18} />
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--navy)" }}>
                        Click or drag logo emblem here
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        Circular viewfinder cropper & live brand simulator will open
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {addError && <p style={{ color: "#EF4444", margin: 0, fontSize: "13px" }}>{addError}</p>}

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button 
                  type="button"
                  onClick={() => { 
                    setShowAddModal(false); 
                    setAddError(""); 
                    setShowPassword(false); 
                    setCroppedLogoData(null);
                    setRawLogoFile(null);
                  }}
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

      {/* Hidden file input for existing department logo updates */}
      <input
        type="file"
        ref={existingFileInputRef}
        accept="image/png, image/jpeg, image/webp"
        style={{ display: "none" }}
        onChange={handleExistingFileSelected}
      />

      {/* Crop Modal for New Department */}
      <DepartmentLogoCropModal
        isOpen={showCropModal}
        imageFile={rawLogoFile}
        deptId={newDeptId || 'DEPT'}
        deptName={newDeptName || 'NEW DEPARTMENT'}
        onClose={() => {
          setShowCropModal(false);
          setRawLogoFile(null);
        }}
        onCropComplete={(result) => {
          setCroppedLogoData(result);
        }}
      />

      {/* Crop Modal for Existing Department */}
      <DepartmentLogoCropModal
        isOpen={showExistingCropModal}
        imageFile={existingRawFile}
        deptId={deptForLogoUpdate?.dept_id || 'DEPT'}
        deptName={deptForLogoUpdate?.dept_name || 'DEPARTMENT'}
        onClose={() => {
          setShowExistingCropModal(false);
          setExistingRawFile(null);
          setDeptForLogoUpdate(null);
        }}
        onCropComplete={handleExistingCropComplete}
      />

      <style>{`
        .department-hover-card {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease !important;
        }
        .department-hover-card:hover {
          transform: translateY(-5px) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04) !important;
          border-color: #CBD5E1 !important;
        }
        .department-hover-card:hover .drill-arrow {
          transform: translateX(4px);
        }
        .department-hover-card:hover .drill-arrow-container {
          transform: scale(1.08);
        }
        .department-hover-card:hover .card-footer {
          background: #F1F5F9 !important;
        }
        .stat-chip {
          transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease !important;
        }
        .stat-chip:hover {
          background: #FFFFFF !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .dept-action-btn {
          transition: all 0.2s ease !important;
        }
        .dept-action-btn:hover {
          transform: scale(1.08);
        }
        .camera-btn:hover {
          background: #16A34A !important;
          color: #FFFFFF !important;
          border-color: #16A34A !important;
          box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25);
        }
        .nuke-btn:hover {
          background: #EF4444 !important;
          color: #FFFFFF !important;
          border-color: #EF4444 !important;
          box-shadow: 0 4px 10px rgba(239, 68, 68, 0.25);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .admin-dept-header {
            flex-direction: column;
            align-items: stretch !important;
          }
          .admin-dept-header button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
