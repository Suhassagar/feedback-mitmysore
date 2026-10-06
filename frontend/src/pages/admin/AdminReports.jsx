import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";
import { toast } from "react-hot-toast";
import {
  FileText, FileSpreadsheet, Download, Building, Award, User,
  Calendar, Users, Star, BarChart3, CheckCircle2, Loader2, ArrowRight
} from "lucide-react";
import { generateDepartmentConsolidatedPdf, generateFacultyAppraisalPdf } from "../../utils/reportPdfEngine";
import { exportDepartmentConsolidatedExcel, exportFacultyAppraisalExcel } from "../../utils/reportExcelEngine";

export default function AdminReports() {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [deptAnalytics, setDeptAnalytics] = useState({});
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null);

  // Load all departments on mount
  useEffect(() => {
    const loadDepts = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/admin/department-summaries", { withCredentials: true });
        const depts = res.data || [];
        setDepartments(depts);
        if (depts.length > 0) {
          setSelectedDeptId(depts[0].dept_id);
        }
      } catch (err) {
        console.error("Error loading departments for reports:", err);
        toast.error("Failed to load department list");
      } finally {
        setLoading(false);
      }
    };
    loadDepts();
  }, []);

  // When selectedDeptId changes, load that department's analytics & faculty
  useEffect(() => {
    if (!selectedDeptId) return;

    const loadDeptDetails = async () => {
      setDeptLoading(true);
      try {
        // 1. Fetch analytics
        const [analyticsRes, facultiesRes] = await Promise.all([
          apiClient.get(`/analytics/department/${selectedDeptId}`, { withCredentials: true }).catch(() => ({ data: {} })),
          apiClient.get(`/faculty/by-dept/${selectedDeptId}`, { withCredentials: true }).catch(() => ({ data: [] }))
        ]);

        const rawFaculties = facultiesRes.data || [];

        // Direct database-weighted ratings from backend
        const facultiesWithRatings = rawFaculties.map((f) => {
          const ratingNum = parseFloat(f.avg_rating);
          const hasFeedback = (f.total_feedback && parseInt(f.total_feedback) > 0) || ratingNum > 0;
          return {
            ...f,
            avgRating: hasFeedback ? ratingNum.toFixed(2) : "N/A"
          };
        });

        facultiesWithRatings.sort((a, b) => {
          if (a.avgRating === "N/A") return 1;
          if (b.avgRating === "N/A") return -1;
          return parseFloat(b.avgRating) - parseFloat(a.avgRating);
        });

        setDeptAnalytics(analyticsRes.data || {});
        setFaculties(facultiesWithRatings);
        if (facultiesWithRatings.length > 0) {
          setSelectedFacultyId(facultiesWithRatings[0].faculty_id);
        } else {
          setSelectedFacultyId("");
        }
      } catch (err) {
        console.error("Error loading department details for reports:", err);
      } finally {
        setDeptLoading(false);
      }
    };

    loadDeptDetails();
  }, [selectedDeptId]);

  const currentDept = departments.find(d => d.dept_id === selectedDeptId);
  const deptName = currentDept?.dept_name || selectedDeptId;
  const currentFaculty = faculties.find(f => String(f.faculty_id) === String(selectedFacultyId)) || faculties[0];

  // Option 1: Department Consolidated Export
  const handleExportDept = async (format) => {
    try {
      setDownloadingType(`dept-${format}`);
      if (format === 'pdf') {
        await generateDepartmentConsolidatedPdf({
          deptName,
          dept_id: selectedDeptId,
          analytics: deptAnalytics,
          faculties
        });
        toast.success(`Department PDF for ${deptName} downloaded!`);
      } else {
        exportDepartmentConsolidatedExcel({
          deptName,
          dept_id: selectedDeptId,
          analytics: deptAnalytics,
          faculties
        });
        toast.success(`Department Excel for ${deptName} downloaded!`);
      }
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate department report");
    } finally {
      setDownloadingType(null);
    }
  };

  // Option 2: Individual Faculty Appraisal Export
  const handleExportFaculty = async (format) => {
    if (!selectedFacultyId) {
      toast.error("Please select a faculty member first");
      return;
    }

    try {
      setDownloadingType(`fac-${format}`);
      const res = await apiClient.get(`/faculty-analytics/${selectedFacultyId}?dept_id=${selectedDeptId}`, {
        withCredentials: true
      });
      const facAnalytics = res.data;

      const profile = facAnalytics.profile || {
        name: currentFaculty?.name,
        designation: currentFaculty?.designation,
        email: currentFaculty?.email,
        dept_name: deptName
      };

      if (format === 'pdf') {
        await generateFacultyAppraisalPdf({
          facultyProfile: profile,
          analytics: facAnalytics,
          deptName
        });
        toast.success(`Appraisal PDF for ${profile.name} downloaded!`);
      } else {
        exportFacultyAppraisalExcel({
          facultyProfile: profile,
          analytics: facAnalytics,
          deptName
        });
        toast.success(`Appraisal Excel for ${profile.name} downloaded!`);
      }
    } catch (err) {
      console.error("Faculty export error:", err);
      toast.error("Failed to generate faculty appraisal report");
    } finally {
      setDownloadingType(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
        <p>Loading Institutional Reports Center...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Page Title & Breadcrumb */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <FileText size={24} color="#1E3A8A" />
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#0F172A" }}>
            Institutional Reports & Appraisal Center
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "14.5px", color: "#64748B" }}>
          Generate official NBA/NAAC-compliant academic evaluation audits and individual faculty appraisal sheets.
        </p>
      </div>

      {/* Department Selector Bar */}
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "18px 24px",
        marginBottom: "24px",
        border: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Building size={20} color="#1E3A8A" />
          <div>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748B", textTransform: "uppercase" }}>
              Selected Department
            </span>
            <div style={{ marginTop: "2px" }}>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#0F172A",
                  background: "#F8FAFC",
                  border: "1.5px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_name} ({d.dept_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Dept Summary Badges */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Dept Average</span>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#1E3A8A" }}>
              {deptAnalytics.avgRating || currentDept?.avg_rating || "0.00"} <span style={{ fontSize: "12px", color: "#64748B" }}>/ 5.00</span>
            </div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#E2E8F0" }}></div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "12px", color: "#64748B" }}>Faculty Count</span>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
              {faculties.length}
            </div>
          </div>
        </div>
      </div>

      {deptLoading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 8px auto" }} />
          <p style={{ fontSize: "14px" }}>Loading data for Department of {deptName}...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 500px), 1fr))", gap: "24px" }}>

          {/* OPTION 1: DEPARTMENT CONSOLIDATED REPORT */}
          <div style={{
            background: "#ffffff",
            borderRadius: "18px",
            border: "1.5px solid #E2E8F0",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ background: "#F0FDF4", color: "#16A34A", padding: "8px", borderRadius: "10px" }}>
                  <Building size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
                    Option 1: Department Consolidated Report
                  </h2>
                  <span style={{ color: "#15803D", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                    Entire Department • Overall & Faculty One-by-One
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "13.5px", color: "#64748B", margin: "12px 0 16px 0", lineHeight: "1.5" }}>
                Comprehensive academic audit report containing the <strong>entire department average rating</strong>, total student evaluations, and a <strong>faculty-by-faculty roster table</strong> with one-by-one performance grades.
              </p>

              {/* Data Summary Table Preview */}
              <div style={{
                background: "#F8FAFC",
                borderRadius: "12px",
                padding: "14px",
                border: "1px solid #E2E8F0",
                marginBottom: "20px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748B" }}>Overall Department Score:</span>
                  <strong style={{ color: "#1E3A8A" }}>{deptAnalytics.avgRating || "0.00"} / 5.00</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: "#64748B" }}>Total Faculty Evaluated:</span>
                  <strong style={{ color: "#0F172A" }}>{faculties.length} Faculty Members</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ color: "#64748B" }}>Total Student Evaluations:</span>
                  <strong style={{ color: "#0F172A" }}>{deptAnalytics.totalSubmitted || 0} Submissions</strong>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => handleExportDept('excel')}
                disabled={downloadingType === 'dept-excel'}
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "1px solid #16A34A",
                  background: "#F0FDF4",
                  color: "#166534",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#DCFCE7"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#F0FDF4"}
              >
                {downloadingType === 'dept-excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                Download Excel (.xlsx)
              </button>

              <button
                onClick={() => handleExportDept('pdf')}
                disabled={downloadingType === 'dept-pdf'}
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(30, 58, 138, 0.25)",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.92"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                {downloadingType === 'dept-pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />}
                Download Official PDF (.pdf)
              </button>
            </div>
          </div>

          {/* OPTION 2: INDIVIDUAL FACULTY PERFORMANCE APPRAISAL */}
          <div style={{
            background: "#ffffff",
            borderRadius: "18px",
            border: "1.5px solid #E2E8F0",
            padding: "26px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ background: "#FAF5FF", color: "#7E22CE", padding: "8px", borderRadius: "10px" }}>
                  <Award size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0F172A" }}>
                    Option 2: Individual Faculty Appraisal
                  </h2>
                  <span style={{ color: "#7E22CE", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
                    Single Faculty Detailed Outcome
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "13.5px", color: "#64748B", margin: "12px 0 16px 0", lineHeight: "1.5" }}>
                Generates a confidential appraisal sheet for the chosen faculty member with individual subject ratings, 5-pillar radar scores, student comments, and signature blocks.
              </p>

              {/* Faculty Selector */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Select Faculty to Appraise:
                </label>
                <select
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1.5px solid #CBD5E1",
                    fontSize: "14px",
                    color: "#0F172A",
                    background: "#F8FAFC",
                    outline: "none",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                >
                  {faculties.length === 0 ? (
                    <option value="">No faculty registered in department</option>
                  ) : (
                    faculties.map((f) => (
                      <option key={f.faculty_id} value={f.faculty_id}>
                        {f.name} ({f.designation || 'Faculty'}) — Avg: {f.avgRating || 'N/A'}/5.00
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Selected Faculty Details Snippet */}
              {currentFaculty && (
                <div style={{
                  background: "#F1F5F9",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "12.5px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <User size={15} color="#475569" />
                    <span style={{ fontWeight: "600", color: "#1E293B" }}>{currentFaculty.name}</span>
                    <span style={{ color: "#64748B" }}>• {currentFaculty.designation || 'Faculty'}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Rating: </span>
                    <strong style={{ color: "#D97706" }}>{currentFaculty.avgRating || "N/A"} / 5.00</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => handleExportFaculty('excel')}
                disabled={downloadingType === 'fac-excel' || !selectedFacultyId}
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "1px solid #16A34A",
                  background: "#F0FDF4",
                  color: "#166534",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: !selectedFacultyId ? 0.6 : 1
                }}
                onMouseEnter={(e) => selectedFacultyId && (e.currentTarget.style.background = "#DCFCE7")}
                onMouseLeave={(e) => selectedFacultyId && (e.currentTarget.style.background = "#F0FDF4")}
              >
                {downloadingType === 'fac-excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                Download Excel (.xlsx)
              </button>

              <button
                onClick={() => handleExportFaculty('pdf')}
                disabled={downloadingType === 'fac-pdf' || !selectedFacultyId}
                style={{
                  flex: "1 1 200px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
                  transition: "all 0.2s",
                  opacity: !selectedFacultyId ? 0.6 : 1
                }}
                onMouseEnter={(e) => selectedFacultyId && (e.currentTarget.style.opacity = "0.92")}
                onMouseLeave={(e) => selectedFacultyId && (e.currentTarget.style.opacity = "1")}
              >
                {downloadingType === 'fac-pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />}
                Download Official PDF (.pdf)
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Compliance accreditation note */}
      <div style={{
        marginTop: "28px",
        padding: "14px 20px",
        background: "#F8FAFC",
        borderRadius: "12px",
        border: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        color: "#64748B"
      }}>
        <CheckCircle2 size={18} color="#16A34A" />
        <span>
          <strong>NBA & NAAC Tier-1 Compliance:</strong> All generated PDF and Excel appraisal documents automatically include standardized curriculum parameters, semester session metadata, and institutional tripartite sign-off blocks.
        </span>
      </div>
    </div>
  );
}
