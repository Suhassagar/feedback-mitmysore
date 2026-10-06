import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { Users, Search, Building, Star, FileText, ArrowRight, Loader2, Filter } from "lucide-react";
import PageTransition from "../../components/PageTransition";

export default function AdminFacultyCenter() {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [facRes, deptRes] = await Promise.all([
          apiClient.get("/admin/global-faculties", { withCredentials: true }),
          apiClient.get("/departments", { withCredentials: true })
        ]);
        if (isMounted) {
          setFaculties(facRes.data || []);
          setDepartments(deptRes.data || []);
        }
      } catch (err) {
        console.error("Error loading faculty center:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, []);

  const filteredFaculties = faculties.filter((f) => {
    const matchesDept = deptFilter === "ALL" || f.dept_id === deptFilter;
    const matchesSearch =
      (f.name && f.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.faculty_id && f.faculty_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.position && f.position.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ background: "#EEF2FF", color: "#4F46E5", padding: "8px", borderRadius: "10px" }}>
                <Users size={22} />
              </div>
              <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>Faculty Management Center</h1>
            </div>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "14px" }}>
              Global roster and performance oversight of instructional faculty across all academic departments
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/admin/reports")}
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
              <FileText size={16} /> Performance Reports
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
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Total Registered Faculty</p>
            <h2 style={{ margin: "6px 0 0 0", color: "var(--navy)", fontSize: "24px" }}>{faculties.length}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Departments Represented</p>
            <h2 style={{ margin: "6px 0 0 0", color: "#4F46E5", fontSize: "24px" }}>{departments.length}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Currently Filtered</p>
            <h2 style={{ margin: "6px 0 0 0", color: "#16A34A", fontSize: "24px" }}>{filteredFaculties.length}</h2>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH & DEPARTMENT FILTER */}
        <div className="card" style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px", maxWidth: "420px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "8px 14px" }}>
            <Search size={18} color="#64748B" />
            <input
              type="text"
              placeholder="Search faculty name, ID, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "#0F172A" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748B", fontSize: "13px", fontWeight: "500" }}>
              <Filter size={15} /> Department:
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                background: "#ffffff",
                fontSize: "13.5px",
                color: "#1E293B",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              <option value="ALL">All Academic Departments</option>
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name || d.dept_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: "0 auto 10px auto" }} />
              <p style={{ fontSize: "14px" }}>Loading global faculty directory...</p>
            </div>
          ) : filteredFaculties.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <Users size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#1E293B" }}>No faculty records found</h3>
              <p style={{ margin: 0, fontSize: "14px" }}>Try adjusting your search criteria or department filter.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: "600" }}>
                    <th style={{ padding: "14px 18px" }}>Faculty Member</th>
                    <th style={{ padding: "14px 18px" }}>Faculty ID</th>
                    <th style={{ padding: "14px 18px" }}>Department</th>
                    <th style={{ padding: "14px 18px" }}>Designation</th>
                    <th style={{ padding: "14px 18px" }}>Feedback Rating</th>
                    <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ divideY: "1px solid #F1F5F9" }}>
                  {filteredFaculties.map((f) => {
                    const rating = parseFloat(f.avg_rating || 0);
                    const ratingColor = rating >= 4.0 ? "#16A34A" : rating >= 3.0 ? "#D97706" : "#DC2626";
                    const ratingBg = rating >= 4.0 ? "#F0FDF4" : rating >= 3.0 ? "#FFFBEB" : "#FEF2F2";

                    return (
                      <tr key={`${f.dept_id}-${f.faculty_id}`} style={{ borderBottom: "1px solid #F1F5F9" }} className="hoverable-row">
                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: "600", color: "#0F172A" }}>{f.name}</div>
                          <div style={{ fontSize: "12px", color: "#64748B" }}>{f.email || "No email on record"}</div>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "#F1F5F9", padding: "4px 8px", borderRadius: "6px", fontFamily: "monospace", fontSize: "12.5px", color: "#475569" }}>
                            {f.faculty_id}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", color: "#334155", fontWeight: "500" }}>
                          {f.dept_name || f.dept_id}
                        </td>
                        <td style={{ padding: "14px 18px", color: "#64748B" }}>
                          {f.position || "Faculty Member"}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "16px",
                            background: ratingBg,
                            color: ratingColor,
                            fontWeight: "600",
                            fontSize: "12.5px"
                          }}>
                            <Star size={13} fill={rating > 0 ? ratingColor : "none"} />
                            {rating > 0 ? `${rating.toFixed(2)} / 5.0` : "No Ratings"}
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
                            Audit Report <ArrowRight size={13} />
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
