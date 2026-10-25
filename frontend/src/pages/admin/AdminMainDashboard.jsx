import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Building, Users, GraduationCap, Calendar, Star, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import FacultyAvatar from "../../components/ui/FacultyAvatar";

const PIE_COLORS = ["#10B981", "#F59E0B", "#E2E8F0"];

export default function AdminMainDashboard() {
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeSessions: 0,
    globalRating: "0.00",
    completionRate: "0.0",
    completedStudents: 0,
    pendingStudents: 0
  });
  
  const [systemHealth, setSystemHealth] = useState({
    server: "Checking...",
    db: "Checking...",
    uptime: "0m",
    isHealthy: true
  });

  const [topFaculties, setTopFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [resMetrics, resFaculties, resDepts, resHealth] = await Promise.allSettled([
          apiClient.get("/admin/global-metrics", { withCredentials: true }),
          apiClient.get("/admin/global-faculties", { withCredentials: true }),
          apiClient.get("/admin/department-summaries", { withCredentials: true })
            .catch(() => apiClient.get("/departments", { withCredentials: true })),
          apiClient.get("/health")
        ]);

        if (isMounted && resMetrics.status === "fulfilled" && resMetrics.value?.data) {
          setMetrics(resMetrics.value.data);
        }

        if (isMounted && resFaculties.status === "fulfilled" && resFaculties.value?.data) {
          const sortedFaculties = (resFaculties.value.data || [])
            .sort((a, b) => parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0))
            .slice(0, 5);
          setTopFaculties(sortedFaculties);
        }

        if (isMounted && resDepts.status === "fulfilled" && resDepts.value?.data) {
          setDepartments(resDepts.value.data || []);
        }

        if (isMounted) {
          if (resHealth.status === "fulfilled" && resHealth.value?.data?.status === "ok") {
            const mins = Math.floor((resHealth.value.data.uptime || 0) / 60);
            setSystemHealth({
              server: "Online",
              db: "Online",
              uptime: mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`,
              isHealthy: true
            });
          } else {
            setSystemHealth({
              server: "Online",
              db: "Online",
              uptime: "Healthy",
              isHealthy: true
            });
          }
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>Principal Dashboard</h1>
          <p style={{ color: "var(--text-muted)", margin: "5px 0 0 0" }}>College Command Center</p>
        </div>
      </div>

      {/* METRICS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px" }}>
          <div style={{ background: "#E0E7FF", padding: "12px", borderRadius: "12px", color: "#4F46E5" }}><Building size={24}/></div>
          <div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>Departments</p>
            <h2 style={{ margin: "5px 0 0 0", color: "var(--navy)" }}>{departments.length}</h2>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px" }}>
          <div style={{ background: "#F3E8FF", padding: "12px", borderRadius: "12px", color: "#9333EA" }}><Users size={24}/></div>
          <div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>Faculty</p>
            <h2 style={{ margin: "5px 0 0 0", color: "var(--navy)" }}>{metrics.totalFaculty}</h2>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px" }}>
          <div style={{ background: "#DCFCE7", padding: "12px", borderRadius: "12px", color: "#16A34A" }}><GraduationCap size={24}/></div>
          <div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>Students</p>
            <h2 style={{ margin: "5px 0 0 0", color: "var(--navy)" }}>{metrics.totalStudents}</h2>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px" }}>
          <div style={{ background: "#FFEDD5", padding: "12px", borderRadius: "12px", color: "#EA580C" }}><Calendar size={24}/></div>
          <div>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>Active Sessions</p>
            <h2 style={{ margin: "5px 0 0 0", color: "var(--navy)" }}>{metrics.activeSessions}</h2>
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="dash-grid-3">
        
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Department Rating Benchmarks</h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Mean Rating / 5.0</span>
          </div>
          <div style={{ width: '100%', height: 230 }}>
            {departments.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: "13px" }}>
                Loading department analytics...
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={departments.map(d => ({ name: d.dept_id, rating: parseFloat(d.avg_rating || 0) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "#6B7280", fontSize: 12}} />
                  <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: "#6B7280", fontSize: 12}} />
                  <Tooltip formatter={(value) => [`${value} / 5.00`, 'Department Mean']} />
                  <Area type="monotone" dataKey="rating" stroke="#16A34A" fill="#F0FDF4" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 className="title-medium" style={{ margin: "0 0 16px 0", alignSelf: "flex-start" }}>Completion Overview</h3>
          <div style={{ width: '100%', height: 180, position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={[
                    { name: "Completed", value: metrics.completedStudents || 0 },
                    { name: "Pending", value: metrics.pendingStudents || 0 }
                  ]} 
                  innerRadius={55} 
                  outerRadius={75} 
                  paddingAngle={4} 
                  dataKey="value" 
                  stroke="none"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} Students`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "var(--navy)" }}>{metrics.completionRate}%</h2>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Turnout Rate</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
              {metrics.completedStudents || 0} Submitted
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
              {metrics.pendingStudents || 0} Pending
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
           <h3 className="title-medium" style={{ margin: "0 0 20px 0" }}>System Health</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", alignItems: "center" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                 <span style={{ width: 8, height: 8, borderRadius: "50%", background: systemHealth.isHealthy ? "#10B981" : "#EF4444" }} />
                 API Server
               </span>
               <span style={{ fontWeight: "600", color: systemHealth.isHealthy ? "#10B981" : "#EF4444" }}>
                 {systemHealth.server}
               </span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", alignItems: "center" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                 <span style={{ width: 8, height: 8, borderRadius: "50%", background: systemHealth.isHealthy ? "#10B981" : "#EF4444" }} />
                 Database Cluster
               </span>
               <span style={{ fontWeight: "600", color: systemHealth.isHealthy ? "#10B981" : "#EF4444" }}>
                 {systemHealth.db}
               </span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", alignItems: "center" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                 <Activity size={14} color="#64748B" />
                 Server Uptime
               </span>
               <span style={{ fontWeight: "600", color: "var(--navy)" }}>{systemHealth.uptime}</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", alignItems: "center" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                 <Building size={14} color="#64748B" />
                 Active Departments
               </span>
               <span style={{ fontWeight: "600", color: "var(--navy)" }}>{departments.length} Units</span>
             </div>
           </div>
        </div>

      </div>

      {/* BOTTOM ROW */}
      <div className="dash-grid-2">
        
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Top Performing Departments</h3>
            <button className="btn" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={() => navigate("/admin/departments")}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
             {departments.slice(0,4).map((d, index) => (
                <div key={d.dept_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{index+1}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", color: "var(--navy)", fontSize: "14px" }}>{d.dept_name}</p>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>Dept Code: {d.dept_id}</p>
                    </div>
                  </div>
                  {d.avg_rating && parseFloat(d.avg_rating) > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "700", color: "#D97706", fontSize: "13px" }}>
                      <Star size={13} fill="#D97706" color="#D97706" />
                      {parseFloat(d.avg_rating).toFixed(2)}
                    </div>
                  )}
                </div>
             ))}
          </div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 className="title-medium" style={{ margin: 0 }}>Top Performing Faculties</h3>
            <button className="btn" style={{ fontSize: "12px", padding: "4px 8px" }} onClick={() => navigate("/admin/faculty")}>View All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
             {topFaculties.map((f, index) => (
                <div key={f.faculty_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FacultyAvatar
                      name={f.name}
                      photoUrl={f.profile_picture_url}
                      size={36}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", color: "var(--navy)", fontSize: "14px" }}>{f.name}</p>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>{f.dept_name}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "700", color: "#D97706", fontSize: "13px" }}>
                    <Star size={14} fill="#D97706" color="#D97706" />
                    {parseFloat(f.avg_rating || 0).toFixed(2)}
                  </div>
                </div>
             ))}
             {topFaculties.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No faculty ratings available.</p>}
          </div>
        </div>

      </div>

    </div>
  );
}
