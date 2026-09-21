import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { ShieldAlert, AlertTriangle, Info, ShieldCheck, CheckCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const dataTrend = [
  { name: "1 May", logs: 400 },
  { name: "6 May", logs: 1300 },
  { name: "11 May", logs: 800 },
  { name: "16 May", logs: 2780 },
  { name: "21 May", logs: 1890 },
  { name: "26 May", logs: 2390 },
  { name: "31 May", logs: 3490 },
];

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadLogs = async () => {
      try {
        const res = await apiClient.get("/admin/audit-logs", { withCredentials: true });
        if (isMounted) setLogs(res.data);
      } catch (err) {
        console.error("Error loading audit logs:", err);
      }
    };

    loadLogs();
    return () => { isMounted = false; };
  }, []);

  const getStatusIcon = (status, action) => {
    if (status === 'error' || action.toLowerCase().includes('fail')) return <ShieldAlert color="#EF4444" size={18} />;
    if (status === 'warning') return <AlertTriangle color="#F59E0B" size={18} />;
    return <CheckCircle color="#10B981" size={18} />;
  };

  const getLevelBadge = (module, action) => {
    let level = "INFO";
    let color = "#3B82F6";
    let bg = "#EFF6FF";

    if (action.toLowerCase().includes('fail') || action.toLowerCase().includes('error')) {
      level = "ERROR"; color = "#EF4444"; bg = "#FEF2F2";
    } else if (action.toLowerCase().includes('warn') || action.toLowerCase().includes('approach')) {
      level = "WARNING"; color = "#F59E0B"; bg = "#FFFBEB";
    }

    return (
      <span style={{ padding: "4px 10px", borderRadius: "12px", background: bg, color: color, fontSize: "11px", fontWeight: "bold" }}>
        {level}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>System Logs Management Center</h1>
        <p style={{ color: "var(--text-muted)", margin: "5px 0 0 0" }}>Monitor system activities, user actions and security events</p>
      </div>

      <div className="dash-grid-4">
         <div className="card" style={{ padding: "20px", display: "flex", gap: "15px", alignItems: "center" }}>
            <div style={{ background: "#EFF6FF", padding: "12px", borderRadius: "8px", color: "#3B82F6" }}><Info size={24}/></div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Total Log Entries</p>
              <h2 style={{ margin: 0, color: "var(--navy)" }}>{logs.length || 0}</h2>
            </div>
         </div>
         <div className="card" style={{ padding: "20px", display: "flex", gap: "15px", alignItems: "center" }}>
            <div style={{ background: "#ECFDF5", padding: "12px", borderRadius: "8px", color: "#10B981" }}><ShieldCheck size={24}/></div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>Info Logs</p>
              <h2 style={{ margin: 0, color: "var(--navy)" }}>{logs.length || 0}</h2>
            </div>
         </div>
      </div>

      <div className="card" style={{ padding: "20px" }}>
        <h3 className="title-medium" style={{ margin: "0 0 20px 0" }}>System Logs</h3>
        {logs.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No audit logs found. Perform some actions in the system to generate logs.</p>
        ) : (
          <table className="table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB", color: "var(--text-muted)", fontSize: "13px" }}>
                <th style={{ padding: "12px" }}>Time</th>
                <th style={{ padding: "12px" }}>Level</th>
                <th style={{ padding: "12px" }}>User</th>
                <th style={{ padding: "12px" }}>Module</th>
                <th style={{ padding: "12px" }}>Action</th>
                <th style={{ padding: "12px" }}>Details</th>
                <th style={{ padding: "12px", textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.log_id} style={{ borderBottom: "1px solid #F3F4F6", fontSize: "14px" }}>
                  <td style={{ padding: "12px", color: "var(--text-muted)" }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}>{getLevelBadge(log.module, log.action)}</td>
                  <td style={{ padding: "12px", fontWeight: "500", color: "var(--navy)" }}>{log.user_name}</td>
                  <td style={{ padding: "12px" }}>{log.module}</td>
                  <td style={{ padding: "12px" }}>{log.action}</td>
                  <td style={{ padding: "12px", color: "var(--text-muted)" }}>{log.details}</td>
                  <td style={{ padding: "12px", textAlign: "center" }}>{getStatusIcon(log.status, log.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
