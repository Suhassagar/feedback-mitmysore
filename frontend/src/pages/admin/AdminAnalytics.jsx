import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { BarChart3, Star, Award, TrendingUp, Users, GraduationCap, Calendar, FileText, ArrowRight, Loader2, LayoutDashboard } from "lucide-react";
import PageTransition from "../../components/PageTransition";

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    activeSessions: 0,
    globalRating: "0.00",
    completionRate: "0.0"
  });
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [metRes, sumRes] = await Promise.all([
          apiClient.get("/admin/global-metrics", { withCredentials: true }),
          apiClient.get("/admin/department-summaries", { withCredentials: true })
        ]);

        if (isMounted) {
          setMetrics(metRes.data || {});
          // Sort summaries by avg_rating descending
          const sorted = (sumRes.data || []).sort(
            (a, b) => parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0)
          );
          setSummaries(sorted);
        }
      } catch (err) {
        console.error("Error loading admin analytics:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { isMounted = false; };
  }, []);

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ background: "#F3E8FF", color: "#9333EA", padding: "8px", borderRadius: "10px" }}>
                <BarChart3 size={22} />
              </div>
              <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>Institutional Analytics</h1>
            </div>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "14px" }}>
              Comparative cross-department feedback quality, student participation, and institutional benchmark ratings
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
              onClick={() => navigate("/admin/reports")}
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
              <FileText size={16} /> Official Reports
            </button>
          </div>
        </div>

        {/* TOP KPI CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
          
          <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "#FEF3C7", color: "#D97706", padding: "14px", borderRadius: "14px" }}>
              <Star size={26} />
            </div>
            <div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Global Institute Rating</p>
              <h2 style={{ margin: "4px 0 0 0", color: "var(--navy)", fontSize: "26px" }}>{metrics.globalRating} <span style={{ fontSize: "14px", color: "#64748B", fontWeight: "normal" }}>/ 5.0</span></h2>
            </div>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "#DCFCE7", color: "#16A34A", padding: "14px", borderRadius: "14px" }}>
              <TrendingUp size={26} />
            </div>
            <div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Submission Rate</p>
              <h2 style={{ margin: "4px 0 0 0", color: "#16A34A", fontSize: "26px" }}>{metrics.completionRate}%</h2>
            </div>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "#EEF2FF", color: "#4F46E5", padding: "14px", borderRadius: "14px" }}>
              <Users size={26} />
            </div>
            <div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Faculty Evaluated</p>
              <h2 style={{ margin: "4px 0 0 0", color: "#4F46E5", fontSize: "26px" }}>{metrics.totalFaculty}</h2>
            </div>
          </div>

          <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ background: "#FFEDD5", color: "#EA580C", padding: "14px", borderRadius: "14px" }}>
              <Calendar size={26} />
            </div>
            <div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Live Sessions</p>
              <h2 style={{ margin: "4px 0 0 0", color: "#EA580C", fontSize: "26px" }}>{metrics.activeSessions}</h2>
            </div>
          </div>

        </div>

        {/* COMPARATIVE DEPARTMENT RANKING TABLE */}
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0F172A" }}>
                Department Performance Benchmarks
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748B" }}>
                Ranked by genuine student satisfaction rating and academic faculty metrics
              </p>
            </div>
            <span style={{ fontSize: "12.5px", background: "#F0FDF4", color: "#15803D", padding: "4px 12px", borderRadius: "20px", fontWeight: "600" }}>
              {summaries.length} Academic Departments
            </span>
          </div>

          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
              <p style={{ fontSize: "14px" }}>Calculating department benchmark summaries...</p>
            </div>
          ) : summaries.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <BarChart3 size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#1E293B" }}>No department data available</h3>
              <p style={{ margin: 0, fontSize: "14px" }}>Department summaries will appear once evaluation data is processed.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: "600" }}>
                    <th style={{ padding: "14px 18px", width: "60px" }}>Rank</th>
                    <th style={{ padding: "14px 18px" }}>Academic Department</th>
                    <th style={{ padding: "14px 18px" }}>Average Rating</th>
                    <th style={{ padding: "14px 18px" }}>Faculty</th>
                    <th style={{ padding: "14px 18px" }}>Students</th>
                    <th style={{ padding: "14px 18px" }}>Active Sessions</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((d, index) => {
                    const rating = parseFloat(d.avg_rating || 0);
                    const ratingPercent = Math.min(100, Math.round((rating / 5.0) * 100));
                    const isTop = index === 0 && rating > 0;

                    return (
                      <tr key={d.dept_id} style={{ borderBottom: "1px solid #F1F5F9" }} className="hoverable-row">
                        <td style={{ padding: "14px 18px" }}>
                          {isTop ? (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "26px", height: "26px", borderRadius: "50%", background: "#FEF3C7", color: "#D97706", fontWeight: "bold", fontSize: "12px" }}>
                              <Award size={15} />
                            </span>
                          ) : (
                            <span style={{ fontWeight: "600", color: "#94A3B8", fontSize: "13px" }}>
                              #{index + 1}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "600", color: "#0F172A" }}>{d.dept_name || d.dept_id}</div>
                          <div style={{ fontSize: "12px", color: "#64748B" }}>Code: {d.dept_id}</div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontWeight: "700", color: rating >= 4.0 ? "#16A34A" : rating >= 3.0 ? "#D97706" : "#475569", minWidth: "50px" }}>
                              {rating > 0 ? `${rating.toFixed(2)} / 5.0` : "N/A"}
                            </span>
                            <div style={{ width: "90px", height: "6px", background: "#E2E8F0", borderRadius: "4px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${ratingPercent}%`,
                                  height: "100%",
                                  background: rating >= 4.0 ? "#16A34A" : rating >= 3.0 ? "#F59E0B" : "#94A3B8",
                                  borderRadius: "4px"
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#334155", fontWeight: "500" }}>
                          {d.faculty_count || 0}
                        </td>
                        <td style={{ padding: "14px 18px", color: "#334155", fontWeight: "500" }}>
                          {d.student_count || 0}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: d.active_sessions > 0 ? "#DCFCE7" : "#F1F5F9",
                            color: d.active_sessions > 0 ? "#166534" : "#64748B",
                            fontSize: "12px",
                            fontWeight: "600"
                          }}>
                            {d.active_sessions || 0} Active
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            onClick={() => navigate("/admin/reports")}
                            className="btn hoverable"
                            style={{
                              padding: "6px 12px",
                              fontSize: "12.5px",
                              borderRadius: "8px",
                              border: "1px solid #E2E8F0",
                              background: "#ffffff",
                              color: "#4F46E5",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            Export Audit <ArrowRight size={13} />
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
