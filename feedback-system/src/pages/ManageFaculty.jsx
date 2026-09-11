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

export default function ManageFaculty() {
  const { dept_id } = useParams();
  const location = useLocation();

  // Consume custom hook instead of layout context
  const { faculties, loadFaculties } = useFaculties(dept_id);

  const [newFacultyId, setNewFacultyId] = useState("");
  const [newFacultyName, setNewFacultyName] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newFacultyEmail, setNewFacultyEmail] = useState("");

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

  const handleDeleteFaculty = async (faculty_id) => {
    if (!window.confirm("Delete this faculty member?")) return;
    try {
      await apiClient.delete(`/faculty/${faculty_id}`, { withCredentials: true });
      loadFaculties();
    } catch (err) { toast.error("Error deleting"); }
  };

  const addFaculty = async () => {
    if (!newFacultyId || !newFacultyName || !newFacultyEmail) return toast.error("All fields required");
    try {
      await apiClient.post("/faculty/add", { faculty_id: newFacultyId, name: newFacultyName, email: newFacultyEmail, dept_id }, { withCredentials: true });
      toast.success("Faculty Added");
      setNewFacultyId(""); setNewFacultyName(""); setNewFacultyEmail("");
      loadFaculties();
    } catch (err) { toast.error("Error adding faculty"); }
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
          handleDeleteFaculty={handleDeleteFaculty}
          loadFaculties={loadFaculties}
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
            <label className="field-label" style={{ fontSize: "13px" }}>Faculty ID</label>
            <input type="text" className="form-input" style={{ padding: "10px" }} placeholder="e.g. F123" value={newFacultyId} onChange={(e) => setNewFacultyId(e.target.value)} />
          </div>
          <div className="flex-col gap-sm">
            <label className="field-label" style={{ fontSize: "13px" }}>Full Name</label>
            <input type="text" className="form-input" style={{ padding: "10px" }} placeholder="John Doe" value={newFacultyName} onChange={(e) => setNewFacultyName(e.target.value)} />
          </div>
          <div className="flex-col gap-sm">
            <label className="field-label" style={{ fontSize: "13px" }}>Email Address</label>
            <input type="email" className="form-input" style={{ padding: "10px" }} placeholder="john@example.com" value={newFacultyEmail} onChange={(e) => setNewFacultyEmail(e.target.value)} />
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
          <div className="dash-card">No faculty found.</div>
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
