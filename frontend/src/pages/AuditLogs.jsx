import React, { useState, useEffect, useMemo } from "react";
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
  Globe,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import EmptyState from "../components/ui/EmptyState";

export default function AuditLogs() {
  const { dept_id } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");

  useEffect(() => {
    fetchLogs();
  }, [dept_id]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/logs/department/${dept_id}`, {
        withCredentials: true,
      });
      setLogs(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError("Failed to load audit logs. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action_type, status) => {
    if (status === 'FAILED') return <XCircle size={18} color="#DC2626" />;
    if (status === 'WARNING') return <AlertTriangle size={18} color="#D97706" />;

    switch (action_type) {
      case 'LOGIN': return <Unlock size={18} color="#9333EA" />;
      case 'LOGOUT': return <Lock size={18} color="#9333EA" />;
      case 'CREATE': return <Plus size={18} color="#16A34A" />;
      case 'DELETE': return <Trash2 size={18} color="#DC2626" />;
      case 'UPLOAD': return <Upload size={18} color="#2563EB" />;
      case 'UPDATE': return <Edit3 size={18} color="#D97706" />;
      case 'SUBMIT': return <CheckCircle2 size={18} color="#059669" />;
      case 'FAILED_LOGIN':
      case 'BLOCKED_LOGIN': return <XCircle size={18} color="#DC2626" />;
      default: return <Shield size={18} color="#64748B" />;
    }
  };

  const getActionBg = (action_type, status) => {
    if (status === 'FAILED') return "#FEE2E2"; // Red light
    if (status === 'WARNING') return "#FEF3C7"; // Amber light

    switch (action_type) {
      case 'LOGIN': 
      case 'LOGOUT': return "#F3E8FF"; // Purple light
      case 'CREATE': return "#DCFCE7"; // Green light
      case 'DELETE': return "#FEE2E2"; // Red light
      case 'UPLOAD': return "#DBEAFE"; // Blue light
      case 'UPDATE': return "#FEF3C7"; // Yellow light
      case 'SUBMIT': return "#D1FAE5"; // Emerald light
      case 'FAILED_LOGIN':
      case 'BLOCKED_LOGIN': return "#FEE2E2";
      default: return "#F1F5F9";
    }
  };

  const getRelativeTime = (dateString, createdAt) => {
    try {
      // 1. Try ISO createdAt first
      if (createdAt) {
        const d = new Date(createdAt);
        if (!isNaN(d.getTime())) return formatDistanceToNow(d, { addSuffix: true });
      }
      // 2. Try SQL formatted string ('%b %d, %Y %I:%i %p')
      if (dateString) {
        const parsedDate = parse(dateString, 'MMM dd, yyyy hh:mm a', new Date());
        if (!isNaN(parsedDate.getTime())) return formatDistanceToNow(parsedDate, { addSuffix: true });
      }
      return dateString || "Recently";
    } catch {
      return dateString || "Recently";
    }
  };

  // Client-side filtering for immediate snappy response
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = selectedAction === "ALL" || 
        String(log.action_type).toUpperCase() === selectedAction.toUpperCase();
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (log.description && log.description.toLowerCase().includes(searchLower)) ||
        (log.entity && log.entity.toLowerCase().includes(searchLower)) ||
        (log.ip_address && log.ip_address.toLowerCase().includes(searchLower)) ||
        (log.device_info && log.device_info.toLowerCase().includes(searchLower));

      return matchesAction && matchesSearch;
    });
  }, [logs, selectedAction, searchTerm]);

  const actionTypes = ["ALL", "LOGIN", "LOGOUT", "UPLOAD", "CREATE", "DELETE", "SUBMIT", "SECURITY"];

  return (
    <PageTransition>
      <div className="dashboard-content">
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <h1 className="title-large" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 6px 0" }}>
              <Shield color="var(--gold)" size={28} /> System Audit Logs
            </h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "14px" }}>
              Tamper-evident security trail and operational history for department <strong>{dept_id?.toUpperCase()}</strong>.
            </p>
          </div>
          <button 
            className="btn" 
            onClick={fetchLogs} 
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh Logs
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="dash-card" style={{ padding: "16px 20px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Action Chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
              <Filter size={13} /> Filter:
            </span>
            {actionTypes.map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setSelectedAction(act)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: selectedAction === act ? "600" : "500",
                  border: "1px solid",
                  borderColor: selectedAction === act ? "var(--primary, #EA580C)" : "var(--border-color)",
                  background: selectedAction === act ? "var(--primary, #EA580C)" : "transparent",
                  color: selectedAction === act ? "#FFF" : "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "240px", flexGrow: 1, maxWidth: "340px" }}>
            <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search logs, IPs, actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card, #FFFFFF)",
                fontSize: "13px",
                color: "var(--text-primary)",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="dash-card flex-col" style={{ gap: "0", padding: "0" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px", gap: "16px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <div className="skeleton" style={{ width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0 }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                    <div className="skeleton" style={{ width: "40%", height: "16px" }} />
                    <div className="skeleton" style={{ width: "20%", height: "12px" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#EF4444" }}>
              <AlertTriangle size={32} style={{ marginBottom: "8px" }} />
              <p>{error}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No audit log entries found"
              description={searchTerm || selectedAction !== "ALL" 
                ? "No log events match your current filter criteria. Try clearing search or changing the filter." 
                : "Activity events will automatically appear here as administrative actions occur."}
              actionText={searchTerm || selectedAction !== "ALL" ? "Reset Filters" : undefined}
              onAction={searchTerm || selectedAction !== "ALL" ? () => { setSearchTerm(""); setSelectedAction("ALL"); } : undefined}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredLogs.map((log, index) => {
                const status = (log.status || 'SUCCESS').toUpperCase();
                return (
                  <div 
                    key={log.log_id} 
                    style={{ 
                      display: "flex", 
                      padding: "18px 20px",
                      borderBottom: index !== filteredLogs.length - 1 ? "1px solid var(--border-color)" : "none",
                      gap: "18px",
                      alignItems: "flex-start",
                      background: status === 'FAILED' ? "rgba(239, 68, 68, 0.02)" : "transparent"
                    }}
                  >
                    {/* Timeline Line & Icon */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "38px" }}>
                      <div style={{ 
                        width: "38px", height: "38px", 
                        borderRadius: "50%", 
                        background: getActionBg(log.action_type, status),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}>
                        {getActionIcon(log.action_type, status)}
                      </div>
                      {index !== filteredLogs.length - 1 && (
                        <div style={{ width: "2px", flexGrow: 1, background: "var(--border-color)", marginTop: "8px", minHeight: "26px" }} />
                      )}
                    </div>

                    {/* Log Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <h4 style={{ margin: 0, fontSize: "14.5px", color: "var(--text-primary)", fontWeight: "600" }}>
                            {log.description}
                          </h4>
                          {status !== 'SUCCESS' && (
                            <span style={{ 
                              fontSize: "11px", 
                              fontWeight: "700", 
                              padding: "2px 8px", 
                              borderRadius: "4px",
                              background: status === 'FAILED' ? "#FEE2E2" : "#FEF3C7",
                              color: status === 'FAILED' ? "#DC2626" : "#D97706"
                            }}>
                              {status}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: "500", whiteSpace: "nowrap" }}>
                          {getRelativeTime(log.formatted_date, log.created_at)}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ 
                          fontSize: "11px", 
                          padding: "3px 8px", 
                          background: "var(--bg-light, #F1F5F9)", 
                          borderRadius: "5px",
                          color: "var(--text-secondary)",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px"
                        }}>
                          {log.action_type} • {log.entity}
                        </span>

                        {log.ip_address && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)" }}>
                            <Globe size={13} />
                            {log.ip_address}
                          </div>
                        )}

                        {log.device_info && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <MonitorSmartphone size={13} />
                            {log.device_info}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
