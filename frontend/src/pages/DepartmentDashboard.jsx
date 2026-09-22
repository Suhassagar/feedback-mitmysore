import { useState } from "react";
import apiClient from "../services/apiClient";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Calendar, Users, GraduationCap, BookOpen, BarChart3,
  Plus, CheckCircle, AlertTriangle, Bell, LogOut, Star
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFaculties } from "../hooks/useFaculties";
import { useSessions } from "../hooks/useSessions";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDepartmentName } from "../hooks/useDepartmentName";

export default function DepartmentDashboard() {
  const { dept_id } = useParams();
  const navigate = useNavigate();

  const { faculties } = useFaculties(dept_id);
  const { sessions, loadSessions } = useSessions(dept_id);
  const { analytics } = useAnalytics(dept_id);
  const deptName = useDepartmentName(dept_id);

  // Note: setShowAddFacultyBox was passed via context, let's just navigate to manage-faculty instead for now
  const setShowAddFacultyBox = () => navigate(`/manage-faculty/${dept_id}`);

  // Create Session Modal State
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sem, setSem] = useState("");
  const [section, setSection] = useState("");

  const generateSessionId = () => {
    const id = "S" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setSessionId(id);
  };

  // Add Subject Modal State
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseSem, setCourseSem] = useState("");

  const handleCreateSession = async () => {
    if (!sessionId || !sem || !section) return toast.error("All fields required");
    try {
      await apiClient.post("/create-session", { session_id: sessionId, dept_id, sem, section }, { withCredentials: true });
      toast.success("Session Created");
      setShowCreateSessionModal(false);
      setSessionId(""); setSem(""); setSection("");
      if (loadSessions) loadSessions();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error creating session");
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!courseName || !courseCode || !courseSem) return toast.error("All fields required");
    try {
      const res = await apiClient.post("/add-course", {
        dept_id,
        course_name: courseName,
        course_code: courseCode,
        sem: courseSem,
      });

      if (res.data.success) {
        toast.success("Subject added successfully!");
        setShowAddSubjectModal(false);
        setCourseName(""); setCourseCode(""); setCourseSem("");
      } else {
        toast.error("Failed to add subject");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const totalFaculty = faculties.length;

  return (
    <>
      {/* Welcome Section */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", color: "var(--text-primary)" }}>
          Welcome back, Department of {deptName || dept_id}
        </h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "15px" }}>Manage your department's feedback and performance from one place.</p>
      </div>

      {/* KPI Statistics */}
      <div className="dash-grid-4">
        <div className="dash-card kpi-card hoverable">
          <div className="kpi-header">
            <div>
              <h3 className="kpi-title">Active Sessions</h3>
              <p className="kpi-value">{activeSessionsCount}</p>
            </div>
            <div className="kpi-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}><Calendar size={24} /></div>
          </div>
        </div>

        <div className="dash-card kpi-card hoverable">
          <div className="kpi-header">
            <div>
              <h3 className="kpi-title">Total Faculty</h3>
              <p className="kpi-value">{totalFaculty}</p>
            </div>
            <div className="kpi-icon" style={{ background: "#FAF5FF", color: "#9333EA" }}><GraduationCap size={24} /></div>
          </div>
        </div>

        <div className="dash-card kpi-card hoverable">
          <div className="kpi-header">
            <div>
              <h3 className="kpi-title">Total Students</h3>
              <p className="kpi-value">{analytics.totalStudents || 0}</p>
            </div>
            <div className="kpi-icon" style={{ background: "#F0FDF4", color: "#16A34A" }}><Users size={24} /></div>
          </div>
        </div>

        <div className="dash-card kpi-card hoverable">
          <div className="kpi-header">
            <div>
              <h3 className="kpi-title">Average Rating</h3>
              <p className="kpi-value">{analytics.avgRating}<span style={{ fontSize: "16px", color: "var(--text-secondary)" }}>/5</span></p>
            </div>
            <div className="kpi-icon" style={{ background: "#FFFBEB", color: "#D97706" }}><BarChart3 size={24} /></div>
          </div>
        </div>
      </div>

      {/* Analytics Trend Chart */}
      <div className="dash-card flex-col" style={{ gap: "20px", marginBottom: "24px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Feedback Submissions (Last 7 Days)</h3>
        <div style={{ width: "100%", height: "250px" }}>
          {analytics.trendData && analytics.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#0F172A', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorSubmissions)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", fontSize: "14px" }}>
              No feedback data in the last 7 days.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px", marginBottom: "24px" }}>
        {/* Top Performing Faculty */}
        <div className="dash-card flex-col" style={{ gap: "20px", margin: 0, height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Top Performing Faculty</h3>
            <button className="btn" style={{ fontSize: "13px", padding: "4px 12px" }} onClick={() => navigate(`/manage-faculty/${dept_id}`)}>View All</button>
          </div>

          {faculties.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>No faculty data available.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, justifyContent: "center" }}>
              {[...faculties].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3).map((f, index) => (
                <div key={f.faculty_id} onClick={() => navigate(`/manage-faculty/${dept_id}?faculty_id=${f.faculty_id}`)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "var(--bg-light)", borderRadius: "12px", border: "1px solid var(--border-color)", cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: index === 0 ? "#FEF08A" : index === 1 ? "#E2E8F0" : "#FED7AA",
                      color: index === 0 ? "#854D0E" : index === 1 ? "#475569" : "#9A3412",
                      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px"
                    }}>
                      #{index + 1}
                    </div>
                    <img
                      src={`https://ui-avatars.com/api/?name=${f.name.replace(" ", "+")}&background=random&color=fff&size=48`}
                      alt={f.name}
                      style={{ borderRadius: "10px", width: "48px", height: "48px" }}
                    />
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{f.name}</h4>
                      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>{f.faculty_id}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FEF9C3", padding: "6px 12px", borderRadius: "20px", color: "#854D0E", fontWeight: "600" }}>
                    <Star size={16} fill="#EAB308" color="#EAB308" />
                    {f.avgRating}/5
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="dash-card flex-col" style={{ gap: "20px", margin: 0, height: "100%" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Quick Actions</h3>
          <div className="dash-grid-2" style={{ gap: "16px", flex: 1 }}>
            <div className="action-card" onClick={() => setShowCreateSessionModal(true)}>
              <div className="action-icon"><Plus size={28} /></div>
              <span className="action-title">Create Session</span>
            </div>
            <div className="action-card" onClick={() => navigate(`/manage-students/${dept_id}`)}>
              <div className="action-icon" style={{ background: "#F0FDF4", color: "#16A34A" }}><Users size={28} /></div>
              <span className="action-title">Upload Students</span>
            </div>
            <div className="action-card" onClick={() => setShowAddFacultyBox(true)}>
              <div className="action-icon" style={{ background: "#FAF5FF", color: "#9333EA" }}><GraduationCap size={28} /></div>
              <span className="action-title">Add Faculty</span>
            </div>
            <div className="action-card" onClick={() => setShowAddSubjectModal(true)}>
              <div className="action-icon" style={{ background: "#FFFBEB", color: "#D97706" }}><BookOpen size={28} /></div>
              <span className="action-title">Add Subject</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE SESSION MODAL */}
      {showCreateSessionModal && (
        <div className="glass-modal-overlay">
          <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "450px", borderRadius: "20px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Create Feedback Session</h3>
            <div className="flex-col gap-sm">
              <label className="field-label">Session ID</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input type="text" className="form-input" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
                <button className="btn btn-primary" onClick={generateSessionId}>Generate</button>
              </div>
            </div>
            <div className="flex-col gap-sm">
              <label className="field-label">Semester</label>
              <input type="number" className="form-input" placeholder="1-8" value={sem} onChange={(e) => setSem(e.target.value)} />
            </div>
            <div className="flex-col gap-sm">
              <label className="field-label">Section</label>
              <input type="text" className="form-input" placeholder="A/B/C" value={section} onChange={(e) => setSection(e.target.value)} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <button className="btn" onClick={() => setShowCreateSessionModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateSession}>Create Session</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUBJECT MODAL */}
      {showAddSubjectModal && (
        <div className="glass-modal-overlay">
          <div className="card glass-modal flex-col gap-md" style={{ width: "100%", maxWidth: "450px", borderRadius: "20px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Add New Subject</h3>
            <form onSubmit={handleAddSubject} className="flex-col gap-md">
              <div className="flex-col gap-sm">
                <label className="field-label">Subject Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Database Management"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-col gap-sm">
                <label className="field-label">Subject Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. CS101"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  required
                />
              </div>
              <div className="flex-col gap-sm">
                <label className="field-label">Semester</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 5"
                  value={courseSem}
                  onChange={(e) => setCourseSem(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="btn" onClick={() => setShowAddSubjectModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn hoverable"
                  style={{
                    background: "var(--focus-ring)",
                    color: "var(--primary)",
                    border: "none",
                    fontWeight: "600",
                    padding: "10px 24px"
                  }}
                >
                  Add Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
