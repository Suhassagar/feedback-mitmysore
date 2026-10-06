import { useState, useEffect, useMemo } from "react";
import apiClient from "../../services/apiClient";
import { 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  ShieldCheck, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Filter, 
  Users, 
  Activity,
  Globe,
  MonitorSmartphone
} from "lucide-react";

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");

  useEffect(() => {
    let isMounted = true;
    loadLogs(isMounted);
    return () => { isMounted = false; };
  }, []);

  const loadLogs = async (isMounted = true) => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/audit-logs", { withCredentials: true });
      if (isMounted) setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  // Dynamic real metrics calculated from logs
  const metrics = useMemo(() => {
    const total = logs.length;
    let success = 0;
    let security = 0;
    const usersSet = new Set();

    logs.forEach(l => {
      const isSec = l.status === 'failed' || 
                    l.status === 'warning' || 
                    l.action?.includes('FAIL') || 
                    l.action?.includes('BLOCKED') || 
                    l.action?.includes('SECURITY') ||
                    l.action?.includes('PURGE');
      if (isSec) security++;
      else success++;

      if (l.user_name) usersSet.add(l.user_name);
    });

    return { total, success, security, uniqueUsers: usersSet.size };
  }, [logs]);

  // Distinct departments / user entities for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    logs.forEach(l => { if (l.user_name) set.add(l.user_name); });
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs based on search, status filter, and department
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Status filter
      if (selectedFilter === "SECURITY") {
        const isSec = log.status === 'failed' || 
                      log.status === 'warning' || 
                      log.action?.includes('FAIL') || 
                      log.action?.includes('BLOCKED') || 
                      log.action?.includes('SECURITY');
        if (!isSec) return false;
      } else if (selectedFilter === "SUCCESS" && log.status !== 'success') {
        return false;
      }

      // Department filter
      if (selectedDept !== "ALL" && log.user_name !== selectedDept) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches = (log.user_name && log.user_name.toLowerCase().includes(s)) ||
                        (log.module && log.module.toLowerCase().includes(s)) ||
                        (log.action && log.action.toLowerCase().includes(s)) ||
                        (log.details && log.details.toLowerCase().includes(s)) ||
                        (log.ip_address && log.ip_address.toLowerCase().includes(s));
        if (!matches) return false;
      }

      return true;
    });
  }, [logs, selectedFilter, selectedDept, searchTerm]);

  const getStatusIcon = (status, action = "") => {
    if (status === 'failed' || status === 'error' || action.toLowerCase().includes('fail')) {
      return <ShieldAlert color="#EF4444" size={17} />;
    }
    if (status === 'warning' || action.toLowerCase().includes('warn') || action.toLowerCase().includes('blocked')) {
      return <AlertTriangle color="#F59E0B" size={17} />;
    }
    return <CheckCircle color="#10B981" size={17} />;
  };

  const getLevelBadge = (module, action = "", status = "") => {
    let level = "INFO";
    let color = "#16A34A";
    let bg = "#F0FDF4";

    if (status === 'failed' || action.toLowerCase().includes('fail') || action.toLowerCase().includes('error')) {
      level = "ERROR"; color = "#DC2626"; bg = "#FEF2F2";
    } else if (status === 'warning' || action.toLowerCase().includes('warn') || action.toLowerCase().includes('blocked')) {
      level = "SECURITY"; color = "#D97706"; bg = "#FFFBEB";
    } else if (action === 'DELETE' || action === 'PURGE') {
      level = "AUDIT"; color = "#7C3AED"; bg = "#F5F3FF";
    }

    return (
      <span style={{ padding: "3px 8px", borderRadius: "10px", background: bg, color: color, fontSize: "11px", fontWeight: "700" }}>
        {level}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>System Logs Management Center</h1>
          <p style={{ color: "var(--text-muted)", margin: "5px 0 0 0", fontSize: "14px" }}>
            Real-time audit trail of institutional operations, credential events, and system mutations.
          </p>
        </div>
        <button 
          className="btn" 
          onClick={() => loadLogs()} 
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh Feed
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="dash-grid-4">
        <div className="card" style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ background: "#F0FDF4", padding: "10px", borderRadius: "8px", color: "#16A34A" }}>
            <Activity size={22}/>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Total Log Entries</p>
            <h2 style={{ margin: "2px 0 0 0", color: "var(--navy)", fontSize: "22px" }}>{metrics.total}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ background: "#ECFDF5", padding: "10px", borderRadius: "8px", color: "#10B981" }}>
            <ShieldCheck size={22}/>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Normal Operations</p>
            <h2 style={{ margin: "2px 0 0 0", color: "var(--navy)", fontSize: "22px" }}>{metrics.success}</h2>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ background: metrics.security > 0 ? "#FEF2F2" : "#F3F4F6", padding: "10px", borderRadius: "8px", color: metrics.security > 0 ? "#DC2626" : "#6B7280" }}>
            <ShieldAlert size={22}/>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Security / Warnings</p>
            <h2 style={{ margin: "2px 0 0 0", color: metrics.security > 0 ? "#DC2626" : "var(--navy)", fontSize: "22px" }}>
              {metrics.security}
            </h2>
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px", display: "flex", gap: "14px", alignItems: "center" }}>
          <div style={{ background: "#F5F3FF", padding: "10px", borderRadius: "8px", color: "#7C3AED" }}>
            <Users size={22}/>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>Active Departments</p>
            <h2 style={{ margin: "2px 0 0 0", color: "var(--navy)", fontSize: "22px" }}>{metrics.uniqueUsers}</h2>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="card" style={{ padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
        {/* Status Filters */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Filter size={13} /> View:
          </span>
          {[
            { label: "All Events", val: "ALL" },
            { label: "Operational", val: "SUCCESS" },
            { label: "Security & Alerts", val: "SECURITY" },
          ].map(f => (
            <button
              key={f.val}
              type="button"
              onClick={() => setSelectedFilter(f.val)}
              style={{
                padding: "5px 12px",
                borderRadius: "16px",
                fontSize: "12px",
                fontWeight: selectedFilter === f.val ? "600" : "500",
                border: "1px solid",
                borderColor: selectedFilter === f.val ? "var(--primary, #EA580C)" : "#E5E7EB",
                background: selectedFilter === f.val ? "var(--primary, #EA580C)" : "transparent",
                color: selectedFilter === f.val ? "#FFF" : "var(--text-muted)",
                cursor: "pointer"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Department Selector */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexGrow: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#FFF",
              fontSize: "12.5px",
              color: "var(--navy)",
              outline: "none"
            }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <div style={{ position: "relative", minWidth: "220px", maxWidth: "320px", flexGrow: 1 }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 30px",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                background: "#FFF",
                fontSize: "12.5px",
                color: "var(--navy)",
                outline: "none"
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 className="title-medium" style={{ margin: 0 }}>System Activity Stream</h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading audit records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <Info size={40} style={{ marginBottom: "10px", color: "#9CA3AF" }} />
            <p style={{ margin: 0, fontWeight: "600" }}>No audit log entries match your criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
            <table className="table" style={{ width: "100%", minWidth: "750px", textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px" }}>Level</th>
                  <th style={{ padding: "12px 16px" }}>User / Dept</th>
                  <th style={{ padding: "12px 16px" }}>Module</th>
                  <th style={{ padding: "12px 16px" }}>Action</th>
                  <th style={{ padding: "12px 16px" }}>Details</th>
                  <th style={{ padding: "12px 16px" }}>Origin</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.log_id} style={{ borderBottom: "1px solid #F3F4F6", fontSize: "13px" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {getLevelBadge(log.module, log.action, log.status)}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "600", color: "var(--navy)", whiteSpace: "nowrap" }}>
                      {log.user_name}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "#4B5563" }}>
                      {log.module}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: "500", whiteSpace: "nowrap" }}>
                      {log.action}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", minWidth: "220px" }}>
                      {log.details}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {log.ip_address || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {getStatusIcon(log.status, log.action)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
