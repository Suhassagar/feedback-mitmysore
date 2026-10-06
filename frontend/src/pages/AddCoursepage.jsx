import { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Search, Upload, Plus, BookOpen } from "lucide-react";
import PageTransition from "../components/PageTransition";
import BulkUploadModal from "../components/BulkUploadModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import EmptyState from "../components/ui/EmptyState";

function AddCoursePage() {
  const { dept_id } = useParams();

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [sem, setSem] = useState("");
  const [formErrors, setFormErrors] = useState({});

  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editCourse, setEditCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Destructive Delete State (UIUX-008)
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Courses of Department
  useEffect(() => {
    fetchCourses();
  }, [dept_id]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/get-courses/${dept_id}`);
      setCourses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateCourseForm = () => {
    const errors = {};
    if (!courseName.trim()) errors.courseName = "Subject name is required";
    if (!courseCode.trim()) errors.courseCode = "Subject code is required";
    if (!sem) {
      errors.sem = "Semester is required";
    } else if (parseInt(sem, 10) < 1 || parseInt(sem, 10) > 8) {
      errors.sem = "Sem must be 1-8";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddCourse = async () => {
    if (!validateCourseForm()) {
      return toast.error("Please fill in all required fields highlighted in red");
    }
    try {
      const res = await apiClient.post("/add-course", {
        dept_id,
        course_name: courseName.trim(),
        course_code: courseCode.trim().toUpperCase(),
        sem: parseInt(sem, 10),
      });
      if (res.data.success) {
        toast.success("Subject added successfully!");
        setCourseName("");
        setCourseCode("");
        setSem("");
        setFormErrors({});
        fetchCourses();
      } else {
        toast.error("Failed to add subject");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Server error");
    }
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/course/${encodeURIComponent(courseToDelete.course_code)}`);
      toast.success(`Subject ${courseToDelete.course_code} removed successfully`);
      setCourseToDelete(null);
      fetchCourses();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting: " + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateCourse = async () => {
    try {
      await apiClient.put(`/course/${encodeURIComponent(editCourse.course_code)}`, {
        course_name: editCourse.course_name,
        sem: editCourse.sem
      });
      setEditCourse(null);
      fetchCourses();
      toast.success("Subject updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error updating: " + (err.response?.data?.error || err.message));
    }
  };

  const filteredCourses = courses.filter(c => 
    c.course_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageTransition>
      <div className="flex-col" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h2 className="title-large text-gradient" style={{ margin: 0 }}>Subject Roster</h2>
            <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0" }}>Manage department subjects and courses.</p>
          </div>
        </div>

        {/* INLINE ADD SUBJECT PANEL */}
        <div className="card" style={{ padding: "20px", marginBottom: "24px", display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="flex-col gap-sm" style={{ flex: 1, minWidth: "150px" }}>
            <label className="field-label" style={{ fontSize: "13px" }}>Subject Name *</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.courseName ? "#EF4444" : undefined,
                boxShadow: formErrors.courseName ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="e.g. Database Management" 
              value={courseName} 
              onChange={(e) => {
                setCourseName(e.target.value);
                if (formErrors.courseName) setFormErrors(prev => ({ ...prev, courseName: "" }));
              }} 
            />
            {formErrors.courseName && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.courseName}</span>
            )}
          </div>
          <div className="flex-col gap-sm" style={{ flex: 1, minWidth: "120px" }}>
            <label className="field-label" style={{ fontSize: "13px" }}>Subject Code *</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.courseCode ? "#EF4444" : undefined,
                boxShadow: formErrors.courseCode ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="e.g. CS101" 
              value={courseCode} 
              onChange={(e) => {
                setCourseCode(e.target.value);
                if (formErrors.courseCode) setFormErrors(prev => ({ ...prev, courseCode: "" }));
              }} 
            />
            {formErrors.courseCode && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.courseCode}</span>
            )}
          </div>
          <div className="flex-col gap-sm" style={{ flex: 1, minWidth: "120px" }}>
            <label className="field-label" style={{ fontSize: "13px" }}>Semester *</label>
            <input 
              type="number" 
              className="form-input" 
              style={{ 
                padding: "10px",
                borderColor: formErrors.sem ? "#EF4444" : undefined,
                boxShadow: formErrors.sem ? "0 0 0 1px #EF4444" : undefined
              }} 
              placeholder="1-8" 
              value={sem} 
              onChange={(e) => {
                setSem(e.target.value);
                if (formErrors.sem) setFormErrors(prev => ({ ...prev, sem: "" }));
              }} 
            />
            {formErrors.sem && (
              <span style={{ fontSize: "11px", color: "#DC2626", fontWeight: "600" }}>{formErrors.sem}</span>
            )}
          </div>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: "1 1 260px" }}>
            <button className="btn" style={{ padding: "10px 20px", whiteSpace: "nowrap", height: "42px", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flex: 1 }} onClick={() => setShowBulkModal(true)}>
              <Upload size={16} /> Bulk Import
            </button>
            <button 
              className="btn hoverable" 
              style={{ 
                padding: "10px 24px", 
                height: "42px", 
                background: "var(--focus-ring)", 
                color: "var(--primary)", 
                border: "none", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "6px", 
                fontWeight: "600",
                whiteSpace: "nowrap",
                flex: 1
              }} 
              onClick={handleAddCourse}
            >
              <Plus size={16} strokeWidth={2.5} /> Add Subject
            </button>
          </div>
        </div>

        <div className="header-search" style={{ marginBottom: "20px", width: "100%", maxWidth: "400px" }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>Loading subjects...</p>
        ) : filteredCourses.length === 0 ? (
          <EmptyState 
            icon={BookOpen}
            title="No Subjects Found"
            description={searchTerm ? "No subjects match your active search filter." : "No course subjects have been registered in this department yet."}
            actionLabel="Add Subject"
            onAction={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        ) : (
          <div className="dash-grid-3">
            {filteredCourses.map((c) => (
              <div key={c.course_code} className="dash-card hoverable flex-col" style={{ gap: "16px", padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "var(--bg-light)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold", border: "1px solid var(--border-color)" }}>
                    Sem {c.sem}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{c.course_name}</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>{c.course_code}</p>
                  </div>
                </div>
                
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                  <button 
                    className="btn" 
                    style={{ border: "1px solid var(--border-color)", fontSize: "13px", padding: "6px 16px" }}
                    onClick={() => setEditCourse(c)}
                  >
                    Edit Details
                  </button>
                  <button 
                    className="btn btn-delete"
                    style={{ fontSize: "13px", padding: "6px 16px" }}
                    onClick={() => setCourseToDelete(c)}
                    aria-label={`Remove subject ${c.course_name}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EDIT SUBJECT MODAL (UIUX-009 Standardized Sizing) */}
        {editCourse && (
          <div className="glass-modal-overlay">
            <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", borderRadius: "20px", padding: "28px" }}>
              <h3 className="title-medium" style={{ margin: 0 }}>Edit Subject</h3>
              <div className="flex-col gap-sm">
                <label className="field-label">Subject Code (Read Only)</label>
                <input type="text" className="form-input" value={editCourse.course_code} readOnly style={{ opacity: 0.7 }} />
              </div>
              <div className="flex-col gap-sm">
                <label className="field-label">Subject Name</label>
                <input type="text" className="form-input" value={editCourse.course_name} onChange={(e) => setEditCourse({...editCourse, course_name: e.target.value})} />
              </div>
              <div className="flex-col gap-sm">
                <label className="field-label">Semester</label>
                <input type="number" className="form-input" value={editCourse.sem} onChange={(e) => setEditCourse({...editCourse, sem: e.target.value})} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button className="btn" onClick={() => setEditCourse(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUpdateCourse}>Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL FOR DESTRUCTIVE SUBJECT DELETION (UIUX-008) */}
        <ConfirmModal
          isOpen={!!courseToDelete}
          onClose={() => setCourseToDelete(null)}
          onConfirm={confirmDeleteCourse}
          title="Remove Course Subject"
          message={`Are you sure you want to remove ${courseToDelete?.course_name} (${courseToDelete?.course_code})?`}
          subtext="Faculty assignments and feedback linked to this course code will be impacted."
          confirmText="Yes, Remove Subject"
          isDestructive={true}
          isLoading={isDeleting}
        />

      </div>

      {showBulkModal && (
        <BulkUploadModal 
          type="courses" 
          dept_id={dept_id} 
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchCourses();
          }} 
        />
      )}
    </PageTransition>
  );
}

export default AddCoursePage;
