import { useState, useEffect } from "react";
import apiClient from "../../../services/apiClient";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { 
  Shield, Star, BookOpen, MessageSquare, Plus, Edit, Trash2, Calendar, ArrowLeft 
} from "lucide-react";
import { toast } from "react-hot-toast";

import AssignSubjectModal from "./AssignSubjectModal";
import ViewSubjectsModal from "./ViewSubjectsModal";
import FacultyAnalyticsChart from "./FacultyAnalyticsChart";
import EditFacultyModal from "./EditFacultyModal";
import FacultyChatModal from "./FacultyChatModal";
import OverallAnalyticsModal from "./OverallAnalyticsModal";

export default function FacultyProfile({ 
  selectedFaculty, 
  setSelectedFaculty, 
  dept_id, 
  handleDeleteFaculty, 
  loadFaculties 
}) {
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [facultyAnalytics, setFacultyAnalytics] = useState(null);
  const [facultyNotes, setFacultyNotes] = useState([]);
  
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [editFaculty, setEditFaculty] = useState(null);
  const [expandedGraphId, setExpandedGraphId] = useState(null);
  const [graphData, setGraphData] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [departmentCourses, setDepartmentCourses] = useState([]);
  const [assignForm, setAssignForm] = useState({ courseCode: "", sem: "", section: "" });
  const [showViewSubjectsModal, setShowViewSubjectsModal] = useState(false);
  const [showOverallAnalyticsModal, setShowOverallAnalyticsModal] = useState(false);

  useEffect(() => {
    if (selectedFaculty) {
      loadFacultyData();
    }
  }, [selectedFaculty]);

  const loadFacultyData = async () => {
    setAssignedSubjects([]);
    setFacultyAnalytics(null);
    setFacultyNotes([]);
    try {
      const res = await apiClient.get(`/faculty/assigned/${encodeURIComponent(selectedFaculty.faculty_id)}?dept=${dept_id}`, { withCredentials: true });
      setAssignedSubjects(res.data);
      
      const analyticsRes = await apiClient.get(`/faculty-analytics/${encodeURIComponent(selectedFaculty.faculty_id)}`, { withCredentials: true });
      setFacultyAnalytics(analyticsRes.data);
      
      const notesRes = await apiClient.get(`/department/notes/${encodeURIComponent(selectedFaculty.faculty_id)}`, { withCredentials: true });
      setFacultyNotes(notesRes.data);
    } catch (err) { 
      toast.error(`Load Error: ${err.message}`); 
    }
  };

  const handleRemoveAssignedSubject = async (course_code) => {
    if (!window.confirm("Are you sure you want to remove this assigned subject?")) return;
    try {
      await apiClient.delete(`/faculty/assigned/${selectedFaculty.faculty_id}/${course_code}`, { withCredentials: true });
      toast.success("Assigned subject removed");
      loadFacultyData();
    } catch (err) {
      toast.error("Error removing assigned subject");
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      await apiClient.post(`/department/notes`, {
        faculty_id: selectedFaculty.faculty_id,
        note_text: newNoteText
      }, { withCredentials: true });
      setNewNoteText("");
      const notesRes = await apiClient.get(`/department/notes/${encodeURIComponent(selectedFaculty.faculty_id)}`, { withCredentials: true });
      setFacultyNotes(notesRes.data);
    } catch (err) {
      toast.error("Failed to add note");
    }
  };

  const handleUpdateFaculty = async () => {
    try {
      await apiClient.put(`/faculty/${editFaculty.faculty_id}`, {
        name: editFaculty.name,
        email: editFaculty.email,
        position: editFaculty.position,
        dob: editFaculty.dob
      }, { withCredentials: true });
      
      setSelectedFaculty(editFaculty);
      setEditFaculty(null);
      loadFaculties();
      toast.success("Faculty updated successfully!");
    } catch (err) { toast.error("Error updating"); }
  };

  const fetchDepartmentCourses = async () => {
    try {
      const res = await apiClient.get(`/courses/by-dept/${dept_id}`, { withCredentials: true });
      setDepartmentCourses(res.data);
    } catch (err) { console.error("Error fetching courses", err); }
  };

  const handleToggleGraph = async (course_id, course_code) => {
    if (expandedGraphId === course_code) {
      setExpandedGraphId(null);
      return;
    }
    setExpandedGraphId(course_code);
    setGraphData([]);
    try {
      const res = await apiClient.get(`/feedback/questions_avg/${selectedFaculty.faculty_id}/${course_code}`, { withCredentials: true });
      const formattedData = res.data.map(item => ({
        name: `Q${item.question_id}`,
        rating: parseFloat(item.avg_rating),
        question_text: item.question_text
      }));
      setGraphData(formattedData);
    } catch (err) {
      toast.error("Error loading graph data");
      setExpandedGraphId(null);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/assign-subject", {
        faculty_id: selectedFaculty.faculty_id,
        dept_id,
        course_code: assignForm.courseCode,
        sem: assignForm.sem,
        section: assignForm.section,
      }, { withCredentials: true });
      if (res.data.success) {
        toast.success("Subject assigned successfully");
        setShowAssignModal(false);
        setAssignForm({ courseCode: "", sem: "", section: "" });
        loadFacultyData();
      } else {
        toast.error(res.data?.message || "Assignment failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Error assigning subject");
    }
  };

  return (
    <div className="flex-col gap-md" style={{ width: "100%", animation: "fadeIn 0.3s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span 
          onClick={() => setSelectedFaculty(null)} 
          style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={14} /> Faculty Roster
        </span>
        <span style={{ color: "var(--border-color)" }}>/</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>Profile Dashboard</span>
      </div>

      <div className="dash-grid-2-1" style={{ alignItems: "flex-start" }}>
        <div className="flex-col" style={{ gap: "24px" }}>
          
          <div className="card" style={{ padding: "32px", display: "flex", alignItems: "center", borderRadius: "16px", background: "linear-gradient(to right, #ffffff, #f8fafc)", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "8px" }}>
              <button 
                className="btn" 
                title="Edit Profile"
                style={{ width: "36px", height: "36px", borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", background: "transparent", color: "var(--text-secondary)", transition: "all 0.2s" }} 
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                onClick={() => setEditFaculty(selectedFaculty)}
              >
                <Edit size={16} />
              </button>
              <button 
                className="btn" 
                title="Remove Faculty"
                style={{ width: "36px", height: "36px", borderRadius: "50%", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", background: "transparent", color: "var(--text-secondary)", transition: "all 0.2s" }} 
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; e.currentTarget.style.color = "var(--red)"; }} 
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }} 
                onClick={() => { handleDeleteFaculty(selectedFaculty.faculty_id); setSelectedFaculty(null); }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <div style={{ position: "relative", width: "100px", height: "100px", flexShrink: 0, borderRadius: "50%", background: "#fff", padding: "4px", boxShadow: "0 8px 24px var(--focus-ring)" }}>
                <img 
                  src={`https://ui-avatars.com/api/?name=${selectedFaculty.name.replace(" ", "+")}&background=random&color=fff&size=100`} 
                  alt="avatar" 
                  style={{ borderRadius: "50%", width: "100%", height: "100%", objectFit: "cover" }} 
                />
                <div style={{ position: "absolute", bottom: "4px", right: "4px", width: "20px", height: "20px", background: "#10B981", border: "4px solid #fff", borderRadius: "50%" }}></div>
              </div>

              <div>
                <h2 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>{selectedFaculty.name}</h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: "#F3E8FF", color: "#7E22CE", padding: "4px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>
                    {selectedFaculty.position || "None"}
                  </span>
                  <span style={{ background: "var(--bg-light)", border: "1px solid var(--border-color)", color: "var(--primary)", padding: "4px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600" }}>
                    <Shield size={12} style={{ display: "inline", marginRight: "4px" }} /> ID: {selectedFaculty.faculty_id}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
                    <MessageSquare size={14} /> {selectedFaculty.email}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-grid-4">
            <div 
              className="card flex-col hoverable" 
              style={{ padding: "16px", gap: "12px", borderRadius: "16px", cursor: "pointer" }}
              onClick={() => setShowOverallAnalyticsModal(true)}
            >
              <div style={{ background: "var(--focus-ring)", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={18} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "4px" }}>Average Rating</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1" }}>{selectedFaculty.avgRating}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>/ 5</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "600" }}>View Breakdown →</div>
                </div>
              </div>
            </div>

            <div className="card flex-col hoverable" style={{ padding: "16px", gap: "12px", borderRadius: "16px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={18} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", marginBottom: "4px" }}>Assigned Subjects</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1" }}>{assignedSubjects.length}</div>
                  <div style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "600", cursor: "pointer" }} onClick={() => setShowViewSubjectsModal(true)}>View subjects →</div>
                </div>
              </div>
            </div>

            <div 
              className="card flex-col hoverable" 
              style={{ padding: "16px", gap: "12px", borderRadius: "16px", cursor: "pointer" }}
              onClick={() => setShowAddNoteModal(true)}
            >
              <div style={{ background: "rgba(59, 130, 246, 0.1)", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={18} color="#3B82F6" />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#3B82F6", fontWeight: "700", marginBottom: "4px" }}>Quick Action</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1" }}>Message Faculty</div>
                </div>
              </div>
            </div>

            <div 
              className="card flex-col hoverable" 
              style={{ padding: "16px", gap: "12px", borderRadius: "16px", cursor: "pointer", background: "linear-gradient(135deg, var(--focus-ring), var(--focus-ring))", border: "1px dashed var(--focus-ring)", transition: "all 0.2s" }}
              onClick={() => { setShowAssignModal(true); fetchDepartmentCourses(); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--focus-ring), var(--focus-ring))"; e.currentTarget.style.borderColor = "var(--primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, var(--focus-ring), var(--focus-ring))"; e.currentTarget.style.borderColor = "var(--focus-ring)"; }}
            >
              <div style={{ background: "var(--primary)", width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px var(--focus-ring)" }}>
                <Plus size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "700", marginBottom: "4px" }}>Quick Action</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", lineHeight: "1" }}>Assign Subject</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "32px", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Assigned Subject Feedback</h3>
                <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>Individual question-wise feedback for assigned subjects.</p>
              </div>
            </div>

            {assignedSubjects.length > 0 && (
              <div style={{ width: "100%", height: "200px", marginBottom: "24px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assignedSubjects.filter(s => s.avg_rating != null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="course_code" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                    <Tooltip 
                      cursor={{ fill: '#F1F5F9' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0F172A', fontWeight: 600 }}
                      formatter={(value) => [parseFloat(value).toFixed(2), 'Average Rating']}
                    />
                    <Bar dataKey="avg_rating" fill="#0F172A" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {assignedSubjects.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", border: "1px dashed var(--border-color)", borderRadius: "12px" }}>
                No subjects assigned yet.
              </div>
            ) : (
              <div className="flex-col" style={{ gap: "12px" }}>
                {assignedSubjects.map((sub, idx) => (
                  <div key={idx} className="flex-col" style={{ border: "1px solid var(--border-color)", background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
                    <div 
                      className={`hoverable ${sub.avg_rating ? 'clickable-card' : ''}`} 
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", position: "relative", cursor: sub.avg_rating ? "pointer" : "default" }}
                      onClick={() => {
                        if (sub.avg_rating) handleToggleGraph(sub.course_id, sub.course_code);
                      }}
                    >
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "var(--primary)" }}></div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ background: "var(--focus-ring)", padding: "10px", borderRadius: "8px" }}>
                          <BookOpen size={18} color="var(--primary)" />
                        </div>
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--text-primary)", fontWeight: "700" }}>{sub.course_name}</h4>
                          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>
                            <span style={{ color: "var(--primary)", fontWeight: "700" }}>{sub.course_code}</span>
                            <span>•</span>
                            <span>Sem {sub.sem}</span>
                            <span>•</span>
                            <span>Sec {sub.section}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Star size={18} color="#F59E0B" fill={sub.avg_rating ? "#F59E0B" : "none"} />
                          <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)" }}>
                            {sub.avg_rating ? parseFloat(sub.avg_rating).toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-col" style={{ gap: "24px" }}>
          <div className="card" style={{ padding: "24px", borderRadius: "16px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", color: '#0F172A', fontWeight: "700" }}>Faculty Information</h3>
            <div className="flex-col" style={{ gap: "20px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Faculty ID</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right", wordBreak: "break-word" }}>{selectedFaculty.faculty_id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Email</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right", wordBreak: "break-word" }}>{selectedFaculty.email}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Department</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right", wordBreak: "break-word" }}>{facultyAnalytics?.profile?.dept_name || dept_id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Designation</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right", wordBreak: "break-word" }}>{selectedFaculty.position || "None"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Date of Birth</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right" }}>
                  {selectedFaculty.dob ? new Date(selectedFaculty.dob).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Not Provided"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Joining Date</span>
                <span style={{ fontWeight: "600", color: "#0F172A", textAlign: "right" }}>
                  {selectedFaculty.joining_date ? new Date(selectedFaculty.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Not Provided"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <span style={{ color: "#64748B", flexShrink: 0 }}>Status</span>
                <span style={{ background: "#ECFDF5", color: "#10B981", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", fontSize: "12px" }}>Active</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "24px", borderRadius: "16px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "700" }}>Performance Snapshot</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: "8px solid #f1f5f9", borderTopColor: "#10B981", borderRightColor: "var(--primary)" }}></div>
              <div className="flex-col" style={{ gap: "8px", fontSize: "12px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }}></div> Excellent</span> <b>{facultyAnalytics && facultyAnalytics.totalFeedback ? Math.round(((facultyAnalytics.distribution?.excellent || 0) / facultyAnalytics.totalFeedback) * 100) : 0}%</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--primary)" }}></div> Good</span> <b>{facultyAnalytics && facultyAnalytics.totalFeedback ? Math.round(((facultyAnalytics.distribution?.good || 0) / facultyAnalytics.totalFeedback) * 100) : 0}%</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B" }}></div> Average</span> <b>{facultyAnalytics && facultyAnalytics.totalFeedback ? Math.round(((facultyAnalytics.distribution?.average || 0) / facultyAnalytics.totalFeedback) * 100) : 0}%</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }}></div> Poor</span> <b>{facultyAnalytics && facultyAnalytics.totalFeedback ? Math.round(((facultyAnalytics.distribution?.poor || 0) / facultyAnalytics.totalFeedback) * 100) : 0}%</b></div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "24px", borderRadius: "16px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "700" }}>Recent Activity</h3>
            <div className="flex-col" style={{ gap: "20px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ background: "var(--focus-ring)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={14} color="var(--primary)" /></div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {facultyAnalytics?.activeSessionsCount > 0 ? `${facultyAnalytics.activeSessionsCount} active sessions` : 'No active sessions'}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    {facultyAnalytics?.activeSessionsCount > 0 ? 'Feedback sessions are currently running' : 'No feedback sessions are currently running'}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "16px" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.1)", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><BookOpen size={14} color="#10B981" /></div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Subjects assigned</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{assignedSubjects.length} subjects assigned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AssignSubjectModal 
        selectedFaculty={selectedFaculty}
        showAssignModal={showAssignModal}
        setShowAssignModal={setShowAssignModal}
        departmentCourses={departmentCourses}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        handleAssignSubmit={handleAssignSubmit}
      />
      
      <ViewSubjectsModal
        selectedFaculty={selectedFaculty}
        showViewSubjectsModal={showViewSubjectsModal}
        setShowViewSubjectsModal={setShowViewSubjectsModal}
        assignedSubjects={assignedSubjects}
        handleRemoveAssignedSubject={handleRemoveAssignedSubject}
      />

      <FacultyAnalyticsChart 
        expandedGraphId={expandedGraphId}
        setExpandedGraphId={setExpandedGraphId}
        graphData={graphData}
      />

      <EditFacultyModal
        editFaculty={editFaculty}
        setEditFaculty={setEditFaculty}
        handleUpdateFaculty={handleUpdateFaculty}
      />

      <FacultyChatModal 
        showAddNoteModal={showAddNoteModal}
        setShowAddNoteModal={setShowAddNoteModal}
        selectedFaculty={selectedFaculty}
        facultyNotes={facultyNotes}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
        handleAddNote={handleAddNote}
      />

      <OverallAnalyticsModal 
        showOverallAnalyticsModal={showOverallAnalyticsModal}
        setShowOverallAnalyticsModal={setShowOverallAnalyticsModal}
        selectedFaculty={selectedFaculty}
        facultyAnalytics={facultyAnalytics}
      />

    </div>
  );
}
