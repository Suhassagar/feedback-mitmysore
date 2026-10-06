import { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Search, Building, Calendar, Loader2, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import PageTransition from "../../components/PageTransition";

export default function AdminStudentCenter() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [semFilter, setSemFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const limit = 20;

  useEffect(() => {
    let isMounted = true;
    const fetchDepartments = async () => {
      try {
        const res = await apiClient.get("/departments", { withCredentials: true });
        if (isMounted) setDepartments(res.data || []);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepartments();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (deptFilter !== "ALL") params.append("dept_id", deptFilter);
        if (semFilter !== "ALL") params.append("sem", semFilter);
        if (searchTerm.trim()) params.append("search", searchTerm.trim());

        const res = await apiClient.get(`/admin/global-students?${params.toString()}`, { withCredentials: true });
        if (isMounted) {
          if (res.data?.data) {
            setStudents(res.data.data);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalCount(res.data.pagination?.total || 0);
          } else if (Array.isArray(res.data)) {
            setStudents(res.data);
            setTotalPages(1);
            setTotalCount(res.data.length);
          }
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudents();
    return () => { isMounted = false; };
  }, [page, deptFilter, semFilter, searchTerm]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <PageTransition>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* HEADER SECTION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ background: "#DCFCE7", color: "#16A34A", padding: "8px", borderRadius: "10px" }}>
                <GraduationCap size={22} />
              </div>
              <h1 className="title-large" style={{ color: "var(--navy)", margin: 0 }}>Student Management Center</h1>
            </div>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "14px" }}>
              Global directory and enrollment records of students across all academic programs and semesters
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/admin/sessions")}
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
              <Calendar size={16} /> Live Feedback Sessions
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
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Total Matching Students</p>
            <h2 style={{ margin: "6px 0 0 0", color: "var(--navy)", fontSize: "24px" }}>{totalCount}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Current Page Records</p>
            <h2 style={{ margin: "6px 0 0 0", color: "#16A34A", fontSize: "24px" }}>{students.length}</h2>
          </div>
          <div className="card" style={{ padding: "18px" }}>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", fontWeight: "500" }}>Total Pages</p>
            <h2 style={{ margin: "6px 0 0 0", color: "#4F46E5", fontSize: "24px" }}>{totalPages}</h2>
          </div>
        </div>

        {/* CONTROLS BAR: SEARCH & FILTERS */}
        <div className="card" style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px", maxWidth: "380px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "8px 14px" }}>
            <Search size={18} color="#64748B" />
            <input
              type="text"
              placeholder="Search by USN or Student Name..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "#0F172A" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748B", fontSize: "13px", fontWeight: "500" }}>Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => handleFilterChange(setDeptFilter, e.target.value)}
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

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#64748B", fontSize: "13px", fontWeight: "500" }}>Semester:</span>
              <select
                value={semFilter}
                onChange={(e) => handleFilterChange(setSemFilter, e.target.value)}
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
                <option value="ALL">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
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
              <p style={{ fontSize: "14px" }}>Loading student records...</p>
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#64748B" }}>
              <GraduationCap size={36} style={{ margin: "0 auto 12px auto", opacity: 0.5 }} />
              <h3 style={{ margin: "0 0 6px 0", color: "#1E293B" }}>No students found</h3>
              <p style={{ margin: 0, fontSize: "14px" }}>Try clearing search keywords or choosing different department/semester filters.</p>
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontWeight: "600" }}>
                      <th style={{ padding: "14px 18px" }}>USN</th>
                      <th style={{ padding: "14px 18px" }}>Student Name</th>
                      <th style={{ padding: "14px 18px" }}>Department</th>
                      <th style={{ padding: "14px 18px" }}>Semester</th>
                      <th style={{ padding: "14px 18px" }}>Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={s.usn || idx} style={{ borderBottom: "1px solid #F1F5F9" }} className="hoverable-row">
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "#F1F5F9", padding: "4px 8px", borderRadius: "6px", fontFamily: "monospace", fontSize: "12.5px", color: "#0F172A", fontWeight: "600" }}>
                            {s.usn}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px", fontWeight: "600", color: "#1E293B" }}>
                          {s.name}
                        </td>
                        <td style={{ padding: "14px 18px", color: "#334155", fontWeight: "500" }}>
                          {s.dept_name || s.dept_id}
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "#F0FDF4", color: "#15803D", padding: "3px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                            Sem {s.sem}
                          </span>
                        </td>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ background: "#F3F4F6", color: "#374151", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                            Sec {s.section || "A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION BAR */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "1px solid #E2E8F0", background: "#FAFAFA" }}>
                <span style={{ fontSize: "13px", color: "#64748B" }}>
                  Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} total students)
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn hoverable"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "13px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      background: "#ffffff",
                      color: "#1E293B",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      opacity: page <= 1 ? 0.5 : 1
                    }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn hoverable"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      fontSize: "13px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      background: "#ffffff",
                      color: "#1E293B",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      opacity: page >= totalPages ? 0.5 : 1
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </PageTransition>
  );
}
