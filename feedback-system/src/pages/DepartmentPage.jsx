import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient";
import { toast } from "react-hot-toast";
import PageTransition from "../components/PageTransition";
import { ArrowLeft } from "lucide-react";

function DepartmentPage() {
  const { dept_id } = useParams();
  const [faculties, setFaculties] = useState([]);
  const [facultyAssignments, setFacultyAssignments] = useState({});
  const navigate = useNavigate();

  // ---------- POPUP STATES ----------
  const [showPopup, setShowPopup] = useState(false);
  const [newFaculty, setNewFaculty] = useState({
    faculty_id: "",
    name: "",
    email: "",
    dept_id: dept_id,
  });

  const [editFaculty, setEditFaculty] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all faculties
  const loadFaculty = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(
        `/faculty/by-dept/${dept_id}`
      );
      setFaculties(res.data);

      // Load assignments for each faculty
      const assignments = {};
      for (const f of res.data) {
        try {
          const aRes = await apiClient.get(
            `/faculty/${f.faculty_id}/assignments`
          );
          assignments[f.faculty_id] = aRes.data;
        } catch (err) {
          assignments[f.faculty_id] = [];
        }
      }
      setFacultyAssignments(assignments);
    } catch (err) {
      console.error("Error fetching faculty:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, [dept_id]);

  // ---------- Handle Add Faculty ----------
  const handleAddFaculty = async () => {
    if (!newFaculty.faculty_id || !newFaculty.name || !newFaculty.email) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await apiClient.post("/faculty/add", newFaculty);
      toast.success("Faculty added successfully");

      setShowPopup(false);
      setNewFaculty({ faculty_id: "", name: "", email: "", dept_id });

      loadFaculty(); // refresh list
    } catch (err) {
      console.error("Error adding faculty:", err);
      toast.error("Failed to add faculty");
    }
  };

  const handleDeleteFaculty = async (faculty_id) => {
    if (!window.confirm("Delete this faculty member?")) return;
    try {
      await apiClient.delete(`/faculty/${faculty_id}`);
      loadFaculty();
    } catch (err) { toast.error("Error deleting"); }
  };

  const handleUpdateFaculty = async () => {
    try {
      await apiClient.put(`/faculty/${editFaculty.faculty_id}`, {
        name: editFaculty.name,
        email: editFaculty.email
      });
      setEditFaculty(null);
      loadFaculty();
    } catch (err) { toast.error("Error updating"); }
  };

  return (
    <PageTransition>
      <div className="container flex-col" style={{ padding: "40px 20px", minHeight: "100vh" }}>
      
      {/* BREADCRUMB NAVIGATION */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <span 
          onClick={() => navigate('/admin-dashboard')} 
          style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} /> Admin Dashboard
        </span>
        <span style={{ color: "var(--border-color)" }}>/</span>
        <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>Department Settings</span>
      </div>
      {/* ---------- NAVBAR ---------- */}
      <nav className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 25px", marginBottom: "30px" }}>
        <h3 className="title-medium text-gradient" style={{ margin: 0 }}>Department: {dept_id}</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn" onClick={() => navigate(`/add-course/${dept_id}`)}>Subject</button>
        </div>
      </nav>

      {/* ---------- HEADER WITH ADD BUTTON ---------- */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 className="title-medium">Faculty List</h2>
        <button className="btn btn-primary" onClick={() => setShowPopup(true)}>
          + Add Faculty
        </button>
      </div>

      {/* ---------- FACULTY LIST ---------- */}
      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : (
        <div>
          {faculties.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px" }}>
              <p>No faculty found for this department.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
              {faculties.map((f) => (
                <div key={f.faculty_id} className="card flex-col gap-sm">
                  <h3 className="title-medium text-gradient" style={{ margin: 0 }}>{f.faculty_id}</h3>
                  <p style={{ margin: "5px 0" }}>
                    <strong>Name:</strong> {f.name}
                  </p>
                  <p style={{ margin: "5px 0", wordBreak: "break-all" }}>
                    <strong>Email:</strong> {f.email}
                  </p>

                  {/* ---------- Assigned Courses ---------- */}
                  <div className="card" style={{ padding: "15px", marginTop: "10px", background: "var(--glass-bg)", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
                    <strong style={{ display: "block", marginBottom: "10px", color: "var(--color-primary)" }}>Assigned Courses:</strong>
                    {facultyAssignments[f.faculty_id] && facultyAssignments[f.faculty_id].length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: "20px" }}>
                        {facultyAssignments[f.faculty_id].map((course) => (
                          <li key={course.course_code} style={{ marginBottom: "5px" }}>
                            {course.course_name} ({course.course_code}) - Sem: {course.sem} | Sec: {course.section}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: "var(--text-muted)" }}>No course assigned yet</p>
                    )}
                  </div>

                  <div className="dash-grid-2" style={{ gap: '10px', marginTop: '15px' }}>
                    <button className="btn" onClick={() => navigate(`/assign-subject/${dept_id}/${f.faculty_id}`)}>
                      Assign
                    </button>
                    <button className="btn" onClick={() => navigate(`/analyze/${f.faculty_id}`)} style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
                      Analyze
                    </button>
                    <button className="btn btn-edit" onClick={() => setEditFaculty(f)}>
                      Edit
                    </button>
                    <button className="btn btn-delete" onClick={() => handleDeleteFaculty(f.faculty_id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- POPUP ADD FACULTY ---------- */}
      {showPopup && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, padding: "20px" }}>
          <div className="card flex-col gap-md" style={{ width: "100%", maxWidth: "450px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Add New Faculty</h3>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Faculty ID</label>
              <input type="text" className="form-input" placeholder="Faculty ID" value={newFaculty.faculty_id} onChange={(e) => setNewFaculty({ ...newFaculty, faculty_id: e.target.value })} />
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Full Name</label>
              <input type="text" className="form-input" placeholder="Full Name" value={newFaculty.name} onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })} />
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Email</label>
              <input type="email" className="form-input" placeholder="Email" value={newFaculty.email} onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button className="btn" onClick={() => setShowPopup(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddFaculty}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- POPUP EDIT FACULTY ---------- */}
      {editFaculty && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000, padding: "20px" }}>
          <div className="card flex-col gap-md" style={{ width: "100%", maxWidth: "450px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Edit Faculty</h3>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Faculty ID (Read Only)</label>
              <input type="text" className="form-input" value={editFaculty.faculty_id} readOnly style={{ opacity: 0.7 }} />
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Full Name</label>
              <input type="text" className="form-input" placeholder="Full Name" value={editFaculty.name} onChange={(e) => setEditFaculty({ ...editFaculty, name: e.target.value })} />
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: "14px", fontWeight: "500" }}>Email</label>
              <input type="email" className="form-input" placeholder="Email" value={editFaculty.email} onChange={(e) => setEditFaculty({ ...editFaculty, email: e.target.value })} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button className="btn" onClick={() => setEditFaculty(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateFaculty}>Save</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
  );
}

export default DepartmentPage;
