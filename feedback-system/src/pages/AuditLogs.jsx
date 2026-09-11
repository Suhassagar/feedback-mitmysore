import React, { useState, useEffect } from "react";
import apiClient from "../services/apiClient";
import { useParams } from "react-router-dom";
import { formatDistanceToNow, parse } from "date-fns";
import { 
  Shield, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Upload, 
  Edit3,
  Server,
  MonitorSmartphone,
  Globe
} from "lucide-react";
import PageTransition from "../components/PageTransition";

export default function AuditLogs() {
  const { dept_id } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [dept_id]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/logs/department/${dept_id}`, {
        withCredentials: true,
      });
      setLogs(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError("Failed to load audit logs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action_type) => {
    switch (action_type) {
      case 'LOGIN': return <Unlock size={18} color="#9333EA" />;
      case 'LOGOUT': return <Lock size={18} color="#9333EA" />;
      case 'CREATE': return <Plus size={18} color="#16A34A" />;
      case 'DELETE': return <Trash2 size={18} color="#DC2626" />;
      case 'UPLOAD': return <Upload size={18} color="#2563EB" />;
      case 'UPDATE': return <Edit3 size={18} color="#D97706" />;
      default: return <Shield size={18} color="#64748B" />;
    }
  };

  const getActionBg = (action_type) => {
    switch (action_type) {
      case 'LOGIN': 
      case 'LOGOUT': return "#F3E8FF"; // Purple light
      case 'CREATE': return "#DCFCE7"; // Green light
      case 'DELETE': return "#FEE2E2"; // Red light
      case 'UPLOAD': return "#DBEAFE"; // Blue light
      case 'UPDATE': return "#FEF3C7"; // Yellow light
      default: return "#F1F5F9";
    }
  };

  const getRelativeTime = (dateString) => {
    try {
      // Date format is '%b %d, %Y %I:%i %p' from SQL (e.g. "Aug 07, 2026 05:30 PM")
      const parsedDate = parse(dateString, 'MMM dd, yyyy hh:mm a', new Date());
      return formatDistanceToNow(parsedDate, { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <PageTransition>
      <div className="dashboard-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 className="title-large" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 8px 0" }}>
              <Shield color="var(--gold)" size={28} /> System Audit Logs
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              Immutable record of all department activities and security events.
            </p>
          </div>
          <button className="btn" onClick={fetchLogs}>
            Refresh Logs
          </button>
        </div>

        <div className="dash-card flex-col" style={{ gap: "0", padding: "0" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              Loading security logs...
            </div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              <Shield size={48} color="var(--border-color)" style={{ marginBottom: "16px" }} />
              <p>No activity logs found for this department.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {logs.map((log, index) => (
                <div 
                  key={log.log_id} 
                  style={{ 
                    display: "flex", 
                    padding: "20px",
                    borderBottom: index !== logs.length - 1 ? "1px solid var(--border-color)" : "none",
                    gap: "20px"
                  }}
                >
                  {/* Timeline Line & Icon */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "40px" }}>
                    <div style={{ 
                      width: "40px", height: "40px", 
                      borderRadius: "50%", 
                      background: getActionBg(log.action_type),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 2
                    }}>
                      {getActionIcon(log.action_type)}
                    </div>
                    {index !== logs.length - 1 && (
                      <div style={{ width: "2px", flexGrow: 1, background: "var(--border-color)", marginTop: "10px", minHeight: "30px" }} />
                    )}
                  </div>

                  {/* Log Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <h4 style={{ margin: 0, fontSize: "15px", color: "var(--text-primary)", fontWeight: "600" }}>
                        {log.description}
                      </h4>
                      <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
                        {getRelativeTime(log.formatted_date)}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ 
                        fontSize: "12px", 
                        padding: "4px 8px", 
                        background: "var(--bg-light)", 
                        borderRadius: "6px",
                        color: "var(--text-secondary)",
                        fontWeight: "600",
                        textTransform: "uppercase"
                      }}>
                        {log.action_type} • {log.entity}
                      </span>

                      {log.ip_address && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                          <Globe size={14} />
                          {log.ip_address}
                        </div>
                      )}

                      {log.device_info && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <MonitorSmartphone size={14} />
                          {log.device_info}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
