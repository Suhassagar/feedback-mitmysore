import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Building, Users, GraduationCap, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const dataTrend = [
  { name: "Jan", uv: 4000 },
  { name: "Feb", uv: 3000 },
  { name: "Mar", uv: 2000 },
  { name: "Apr", uv: 2780 },
  { name: "May", uv: 1890 },
  { name: "Jun", uv: 2390 },
  { name: "Jul", uv: 3490 },
];

const dataPie = [
  { name: "Completed", value: 3168 },
  { name: "In Progress", value: 249 },
  { name: "Pending", value: 107 },
  { name: "Not Started", value: 36 },
];

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

export default function AdminMainDashboard() {
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeSessions: 0,
    globalRating: "0.0",
    completionRate: "0.0"
  });
  
  const [topFaculties, setTopFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const resMetrics = await apiClient.get("/admin/global-metrics", { withCredentials: true });
        if (isMounted) setMetrics(resMetrics.data);

        const resFaculties = await apiClient.get("/admin/global-faculties", { withCredentials: true });
        const sortedFaculties = resFaculties.data.sort((a,b) => parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0)).slice(0, 5);
        if (isMounted) setTopFaculties(sortedFaculties);

        const resDepts = await apiClient.get("/departments", { withCredentials: true });
        if (isMounted) setDepartments(resDepts.data);
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
          <h3 className="title-medium" style={{ margin: "0 0 20px 0" }}>Feedback Submission Trend</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart data={dataTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "#6B7280", fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: "#6B7280", fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="uv" stroke="#3B82F6" fill="#EFF6FF" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 className="title-medium" style={{ margin: "0 0 20px 0", alignSelf: "flex-start" }}>Completion Overview</h3>
          <div style={{ width: '100%', height: 200, position: "relative" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {dataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px", color: "var(--navy)" }}>{metrics.completionRate}%</h2>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Overall</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "20px" }}>
           <h3 className="title-medium" style={{ margin: "0 0 20px 0" }}>System Health</h3>
           <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{width: 8, height: 8, borderRadius: "50%", background: "#10B981"}}></span>Server Status</span>
               <span style={{ fontWeight: "600", color: "#10B981" }}>Online</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{width: 8, height: 8, borderRadius: "50%", background: "#10B981"}}></span>Database</span>
               <span style={{ fontWeight: "600", color: "#10B981" }}>Online</span>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
               <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{width: 8, height: 8, borderRadius: "50%", background: "#10B981"}}></span>Departments</span>
               <span style={{ fontWeight: "600", color: "var(--navy)" }}>{departments.length} / {departments.length}</span>
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
             {departments.slice(0,3).map((d, index) => (
                <div key={d.dept_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#FEF3C7", color: "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>{index+1}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", color: "var(--navy)", fontSize: "14px" }}>{d.dept_name}</p>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>Academic Department</p>
                    </div>
                  </div>
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
                    <img src={`https://ui-avatars.com/api/?name=${f.name}&background=random`} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", color: "var(--navy)", fontSize: "14px" }}>{f.name}</p>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>{f.dept_name}</p>
                    </div>
                  </div>
                  <div style={{ fontWeight: "bold", color: "#D97706" }}>
                    {parseFloat(f.avg_rating || 0).toFixed(2)} ⭐
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
