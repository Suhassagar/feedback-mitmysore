import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Calendar, Search, Building, CheckCircle2, Clock, ArrowRight, Loader2, Filter, LayoutDashboard } from "lucide-react";
import PageTransition from "../../components/PageTransition";

export default function AdminSessionCenter() {
  const [sessions, setSessions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sessRes, deptRes] = await Promise.all([
          apiClient.get("/admin/global-sessions", { withCredentials: true }),
          apiClient.get("/departments", { withCredentials: true })
        ]);
        if (isMounted) {
          setSessions(sessRes.data || []);
          setDepartments(deptRes.data || []);
        }
      } catch (err) {
        console.error("Error fetching sessions center:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  const activeCount = sessions.filter((s) => s.status === "active").length;
  const closedCount = sessions.filter((s) => s.status !== "active").length;

  const filteredSessions = sessions.filter((s) => {
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    const matchesDept = deptFilter === "ALL" || s.dept_id === deptFilter;
    const matchesSearch =
      String(s.session_id).includes(searchTerm) ||
      (s.dept_name && s.dept_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.dept_id && s.dept_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesDept && matchesSearch;
  });

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ background: "#FFEDD5", color: "#EA580C", padding: "8px", borderRadius: "10px" }}>
                <Calendar size={22} />
              </div>
              <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>Session Management Center</h1>
            </div>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "14px" }}>
              Institution-wide real-time tracking of active and historical student feedback evaluation sessions
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="btn hoverable"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                background: "#ffffff",
                color: "#1E293B",
                fontWeight: "600",
                fontSize: "13.5px"
              }}
            >
              <LayoutDashboard size={16} /> Principal Dashboard
            </button>
            <button
              onClick={() => navigate("/admin/departments")}
              className="btn btn-primary hoverable"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 16px",
                borderRadius: "10px",
                fontSize: "13.5px"
              }}
            >
              <Building size={16} /> Department Overseer
            </button>
          </div>
        </div>

        {/* METRICS SUMMARY */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Total Recorded Sessions</p>
            <h2 style={{ margin: "6px 0 0 0", color: "var(--navy)", fontSize: "24px" }}>{sessions.length}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16A34A", display: "inline-block" }}></span>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Active Feedback Sessions</p>
            </div>
            <h2 style={{ margin: "6px 0 0 0", color: "#16A34A", fontSize: "24px" }}>{activeCount}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Closed / Archived Sessions</p>
            <h2 style={{ margin: "6px 0 0 0", color: "#64748B", fontSize: "24px" }}>{closedCount}</h2>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="card" style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px", maxWidth: "380px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "8px 14px" }}>
            <Search size={18} color="#64748B" />
            <input
              type="text"
              placeholder="Search session ID or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "#0F172A" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748B", fontSize: "13px", fontWeight: "500" }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid #CBD5E1",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#1E293B",
                  fontWeight: "500"
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active Sessions</option>
                <option value="closed">Closed / Inactive</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748B", fontSize: "13px", fontWeight: "500" }}>Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid #CBD5E1",
                  background: "#ffffff",
                  fontSize: "13px",
                  color: "#1E293B",
                  fontWeight: "500"
                }}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_name || d.dept_id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
              <p style={{ fontSize: "14px" }}>Loading session registry...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <Calendar size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#1E293B" }}>No feedback sessions found</h3>
              <p style={{ margin: 0, fontSize: "14px" }}>Try adjusting status filters or department selections.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: "600" }}>
                    <th style={{ padding: "14px 18px" }}>Session ID</th>
                    <th style={{ padding: "14px 18px" }}>Department</th>
                    <th style={{ padding: "14px 18px" }}>Cohort</th>
                    <th style={{ padding: "14px 18px" }}>Status</th>
                    <th style={{ padding: "14px 18px" }}>Created At</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s) => {
                    const isActive = s.status === "active";

                    return (
                      <tr key={s.session_id} style={{ borderBottom: "1px solid #F1F5F9" }} className="hoverable-row">
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "#F1F5F9", padding: "4px 8px", borderRadius: "6px", fontFamily: "monospace", fontSize: "12.5px", color: "#0F172A", fontWeight: "600" }}>
                            #{s.session_id}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: "600", color: "#1E293B" }}>
                          {s.dept_name || s.dept_id}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ fontWeight: "500", color: "#334155" }}>
                            Semester {s.sem} • Section {s.section || "A"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          {isActive ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              background: "#F0FDF4",
                              color: "#166534",
                              fontWeight: "600",
                              fontSize: "12px"
                            }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16A34A" }}></span>
                              Active
                            </span>
                          ) : (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              background: "#F1F5F9",
                              color: "#475569",
                              fontWeight: "600",
                              fontSize: "12px"
                            }}>
                              <Clock size={12} />
                              Closed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748B", fontSize: "13px" }}>
                          {s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/manage-sessions/${s.dept_id}`)}
                            className="btn hoverable"
                            style={{
                              padding: "6px 12px",
                              fontSize: "12.5px",
                              borderRadius: "8px",
                              border: "1px solid #E2E8F0",
                              background: "#ffffff",
                              color: "#EA580C",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            Manage <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </PageTransition>
  );
}
