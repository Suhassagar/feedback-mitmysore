import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useParams, useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { Users, UserPlus, Search, 
  BarChart3, Settings, Shield, Plus, GraduationCap, Building, Star, MoreVertical, Calendar, ArrowRight, ArrowLeft, LogOut, Edit, Trash2, BookOpen, Clock, MessageSquare, CheckCircle2, FileText, Upload, AlertCircle, Send, CheckCheck, Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import BulkUploadModal from "../components/BulkUploadModal";
import FacultyProfile from "../features/faculty/components/FacultyProfile";
import { useFaculties } from "../hooks/useFaculties";
import ConfirmModal from "../components/ui/ConfirmModal";
import EmptyState from "../components/ui/EmptyState";

export default function ManageFaculty() {
  const { dept_id } = useParams();
  const location = useLocation();

  // Consume custom hook instead of layout context
  const { faculties, loadFaculties } = useFaculties(dept_id);

  const [newFacultyId, setNewFacultyId] = useState("");
  const [newFacultyName, setNewFacultyName] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newFacultyEmail, setNewFacultyEmail] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Destructive Delete State (UIUX-008)
  const [facultyToDelete, setFacultyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const facultyIdFromUrl = searchParams.get('faculty_id');
    
    if (facultyIdFromUrl && faculties.length > 0 && !selectedFaculty) {
      const targetFaculty = faculties.find(f => f.faculty_id === facultyIdFromUrl);
      if (targetFaculty) {
        setSelectedFaculty(targetFaculty);
      }
    }
  }, [location.search, faculties]);

  const confirmDeleteFaculty = async () => {
    if (!facultyToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/faculty/${facultyToDelete.faculty_id}`, { withCredentials: true });
      toast.success(`Faculty member ${facultyToDelete.name} deleted successfully`);
      setFacultyToDelete(null);
      if (selectedFaculty?.faculty_id === facultyToDelete.faculty_id) {
        setSelectedFaculty(null);
      }
      loadFaculties();
    } catch (err) { 
      toast.error(err.response?.data?.error || "Error deleting faculty member"); 
    } finally {
      setIsDeleting(false);
    }
  };

  const validateFacultyForm = () => {
    const errors = {};
    if (!newFacultyId.trim()) errors.id = "Faculty ID is required";
    if (!newFacultyName.trim()) errors.name = "Full name is required";
    if (!newFacultyEmail.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newFacultyEmail.trim())) {
      errors.email = "Valid email is required";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addFaculty = async () => {
    if (!validateFacultyForm()) {
      return toast.error("Please fill in all required fields highlighted in red");
    }
    try {
      await apiClient.post("/faculty/add", { 
        faculty_id: newFacultyId.trim().toUpperCase(), 
        name: newFacultyName.trim(), 
        email: newFacultyEmail.trim().toLowerCase(), 
        dept_id 
      }, { withCredentials: true });
      toast.success("Faculty Added successfully");
      setNewFacultyId(""); 
      setNewFacultyName(""); 
      setNewFacultyEmail("");
      setFormErrors({});
      loadFaculties();
    } catch (err) { 
      toast.error(err.response?.data?.error || "Error adding faculty"); 
    }
  };

  const filteredFaculties = faculties.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.faculty_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedFaculty) {
    return (
      <PageTransition>
        <FacultyProfile 
          selectedFaculty={selectedFaculty}
          setSelectedFaculty={setSelectedFaculty}
          dept_id={dept_id}
          handleDeleteFaculty={(fid) => {
            const fac = faculties.find(f => f.faculty_id === fid) || { faculty_id: fid, name: fid };
            setFacultyToDelete(fac);
          }}
          loadFaculties={loadFaculties}
        />
        {/* Modal if triggered from profile view */}
        <ConfirmModal
          isOpen={!!facultyToDelete}
          onClose={() => setFacultyToDelete(null)}
          onConfirm={confirmDeleteFaculty}
          title="Delete Faculty Member"
          message={`Are you sure you want to permanently delete faculty member "${facultyToDelete?.name}" (${facultyToDelete?.faculty_id})?`}
          subtext="This action will permanently cascade and delete all subject assignments, evaluation results, and notes."
          confirmText="Yes, Delete Faculty"
          isDestructive={true}
          isLoading={isDeleting}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex-col" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h2 className="title-large text-gradient" style={{ margin: 0 }}>Faculty Roster</h2>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>Manage department faculty and assigned subjects.</p>
          </div>
        </div>

        {/* INLINE ADD FACULTY PANEL */}
        <div className="card dash-grid-4" style={{ padding: "20px", marginBottom: "24px", alignItems: "flex-end" }}>
          <div className="flex-col gap-sm">
            <label className="field-label" style={{ fontSize: "13px" }}>Faculty ID *</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.id ? "#EF4444" : undefined,
                boxShadow: formErrors.id ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="e.g. F123" 
              value={newFacultyId} 
              onChange={(e) => {
                setNewFacultyId(e.target.value);
                if (formErrors.id) setFormErrors(prev => ({ ...prev, id: "" }));
              }} 
            />
            {formErrors.id && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.id}</span>
            )}
          </div>
          <div className="flex-col gap-sm">
            <label className="field-label" style={{ fontSize: "13px" }}>Full Name *</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.name ? "#EF4444" : undefined,
                boxShadow: formErrors.name ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="John Doe" 
              value={newFacultyName} 
              onChange={(e) => {
                setNewFacultyName(e.target.value);
                if (formErrors.name) setFormErrors(prev => ({ ...prev, name: "" }));
              }} 
            />
            {formErrors.name && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.name}</span>
            )}
          </div>
          <div className="flex-col gap-sm">
            <label className="field-label" style={{ fontSize: "13px" }}>Email Address *</label>
            <input 
              type="email" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.email ? "#EF4444" : undefined,
                boxShadow: formErrors.email ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="john@example.com" 
              value={newFacultyEmail} 
              onChange={(e) => {
                setNewFacultyEmail(e.target.value);
                if (formErrors.email) setFormErrors(prev => ({ ...prev, email: "" }));
              }} 
            />
            {formErrors.email && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.email}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
            <button className="btn hoverable" style={{ padding: "10px 24px", whiteSpace: "nowrap", height: "42px", background: "var(--focus-ring)", color: "var(--primary)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: "600", width: "100%" }} onClick={addFaculty}>
              <Plus size={16} strokeWidth={2.5} /> Add Faculty
            </button>
            <button className="btn" style={{ padding: "10px 20px", whiteSpace: "nowrap", height: "42px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }} onClick={() => setShowBulkModal(true)}>
              <Upload size={16} /> Bulk Import
            </button>
          </div>
        </div>

        <div className="header-search" style={{ marginBottom: "20px", width: "100%", maxWidth: "400px" }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {filteredFaculties.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="No Faculty Members Found"
            description={searchTerm ? "No faculty members match your active search query." : "No faculty registered in this department yet. Add one above or import via Bulk Excel."}
            actionLabel="Bulk Import Faculty"
            onAction={() => setShowBulkModal(true)}
          />
        ) : (
          <div className="dash-grid-3">
            {filteredFaculties.map((f) => (
              <div key={f.faculty_id} className="dash-card hoverable flex-col" style={{ padding: "20px", position: "relative" }}>
                
                {/* 3 Dot Menu */}
                <div style={{ position: "absolute", right: "20px", top: "20px", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <MoreVertical size={18} />
                </div>

                {/* Top Section */}
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                  
                  {/* Avatar */}
                  <div style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0 }}>
                    <img 
                      src={`https://ui-avatars.com/api/?name=${f.name.replace(" ", "+")}&background=random&color=fff&size=72`}
                      alt={f.name}
                      style={{ borderRadius: "50%", width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div style={{ 
                      position: "absolute", bottom: "2px", right: "2px", width: "16px", height: "16px", 
                      background: "#10B981", border: "3px solid #fff", borderRadius: "50%" 
                    }}></div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, paddingRight: "10px" }}>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>{f.name}</h3>
                    <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>{f.position || "None"}</p>
                    
                    <span style={{ 
                      background: "#F3E8FF", color: "#7E22CE", padding: "4px 10px", 
                      borderRadius: "6px", fontSize: "12px", fontWeight: "600", display: "inline-block" 
                    }}>
                      {f.faculty_id}
                    </span>
                  </div>

                  {/* Vertical Divider */}
                  <div style={{ width: "1px", background: "var(--border-color)", margin: "0" }}></div>

                  {/* Stats */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingLeft: "10px", minWidth: "70px" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Rating</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", color: "var(--text-primary)" }}>
                        <Star size={14} fill="#F59E0B" color="#F59E0B" style={{ marginTop: "-2px" }} />
                        {f.avgRating} <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>/ 5</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>Subjects</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{f.totalSubjects || 0}</div>
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "20px 0" }} />

                {/* Bottom Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "500" }}>
                    <Calendar size={16} /> Joined recently
                  </div>
                  <button 
                    style={{ 
                      background: "none", border: "none", color: "var(--primary)", fontSize: "13px", 
                      fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: 0 
                    }}
                    onClick={() => setSelectedFaculty(f)}
                  >
                    View Profile <ArrowRight size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

      {/* CONFIRMATION MODAL FOR DELETING FACULTY MEMBER (UIUX-008) */}
      <ConfirmModal
        isOpen={!!facultyToDelete}
        onClose={() => setFacultyToDelete(null)}
        onConfirm={confirmDeleteFaculty}
        title="Delete Faculty Member"
        message={`Are you sure you want to permanently delete faculty member "${facultyToDelete?.name}" (${facultyToDelete?.faculty_id})?`}
        subtext="This action will permanently cascade and delete all subject assignments, evaluation results, and notes."
        confirmText="Yes, Delete Faculty"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {showBulkModal && (
        <BulkUploadModal 
          type="faculty" 
          dept_id={dept_id} 
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            loadFaculties();
          }} 
        />
      )}
    </PageTransition>
  );
}
