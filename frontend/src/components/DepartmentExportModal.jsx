import React, { useState } from "react";
import { toast } from "react-hot-toast";
import {
  FileText, FileSpreadsheet, X, Building2, User,
  Loader2, CheckCircle, ChevronDown
} from "lucide-react";
import apiClient from "../services/apiClient";
import { generateDepartmentConsolidatedPdf, generateFacultyAppraisalPdf } from "../utils/reportPdfEngine";
import { exportDepartmentConsolidatedExcel, exportFacultyAppraisalExcel } from "../utils/reportExcelEngine";

export default function DepartmentExportModal({
  isOpen,
  onClose,
  dept_id,
  deptName,
  analytics = {},
  faculties = []
}) {
  const [activeTab, setActiveTab] = useState("dept"); // 'dept' or 'faculty'
  const [selectedFacultyId, setSelectedFacultyId] = useState(faculties[0]?.faculty_id || "");
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [downloadingType, setDownloadingType] = useState(null); // 'dept-pdf', 'dept-excel', 'fac-pdf', 'fac-excel'

  if (!isOpen) return null;

  // Selected faculty object from list
  const currentFaculty = faculties.find(f => String(f.faculty_id) === String(selectedFacultyId)) || faculties[0];

  // Handler for Option 1: Department Consolidated
  const handleExportDept = async (format) => {
    try {
      setDownloadingType(`dept-${format}`);
      if (format === 'pdf') {
        await generateDepartmentConsolidatedPdf({
          deptName,
          dept_id,
          analytics,
          faculties
        });
        toast.success("Department Consolidated PDF downloaded");
      } else {
        exportDepartmentConsolidatedExcel({
          deptName,
          dept_id,
          analytics,
          faculties
        });
        toast.success("Department Consolidated Excel downloaded");
      }
    } catch (err) {
      console.error("Department export error:", err);
      toast.error("Failed to generate department report");
    } finally {
      setDownloadingType(null);
    }
  };

  // Handler for Option 2: Individual Faculty Appraisal
  const handleExportFaculty = async (format) => {
    if (!selectedFacultyId) {
      toast.error("Please select a faculty member first");
      return;
    }

    try {
      setDownloadingType(`fac-${format}`);
      setFacultyLoading(true);

      const res = await apiClient.get(`/faculty-analytics/${selectedFacultyId}?dept_id=${dept_id}`, {
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
        toast.success(`Appraisal PDF for ${profile.name} downloaded`);
      } else {
        exportFacultyAppraisalExcel({
          facultyProfile: profile,
          analytics: facAnalytics,
          deptName
        });
        toast.success(`Appraisal Excel for ${profile.name} downloaded`);
      }
    } catch (err) {
      console.error("Faculty appraisal export error:", err);
      toast.error("Failed to generate faculty appraisal report");
    } finally {
      setFacultyLoading(false);
      setDownloadingType(null);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1200,
      padding: "16px"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "14px",
        width: "100%",
        maxWidth: "540px",
        maxHeight: "min(92vh, 660px)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 0 1px rgba(15, 23, 42, 0.2)",
        overflow: "hidden",
        border: "1px solid #E2E8F0"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #F1F5F9"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1E3A8A"
            }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "#0F172A" }}>
                Export Academic Reports
              </h3>
              <p style={{ margin: 0, fontSize: "12.5px", color: "#64748B" }}>
                Department of {deptName || dept_id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "6px",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              transition: "background 0.15s, color 0.15s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Segmented Control / Tab Switcher */}
        <div style={{ padding: "16px 24px 0 24px" }}>
          <div style={{
            display: "flex",
            background: "#F1F5F9",
            borderRadius: "8px",
            padding: "3px",
            border: "1px solid #E2E8F0"
          }}>
            <button
              onClick={() => setActiveTab("dept")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: activeTab === "dept" ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "dept" ? "#ffffff" : "transparent",
                color: activeTab === "dept" ? "#0F172A" : "#64748B",
                boxShadow: activeTab === "dept" ? "0 1px 2px rgba(0, 0, 0, 0.06)" : "none"
              }}
            >
              Department Consolidated
            </button>

            <button
              onClick={() => setActiveTab("faculty")}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                fontSize: "13px",
                fontWeight: activeTab === "faculty" ? "600" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: activeTab === "faculty" ? "#ffffff" : "transparent",
                color: activeTab === "faculty" ? "#0F172A" : "#64748B",
                boxShadow: activeTab === "faculty" ? "0 1px 2px rgba(0, 0, 0, 0.06)" : "none"
              }}
            >
              Faculty Appraisal
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div style={{ padding: "16px 24px 20px 24px", flex: 1, overflowY: "auto" }}>

          {activeTab === "dept" ? (
            /* TAB 1: DEPARTMENT CONSOLIDATED */
            <div>
              <div style={{
                background: "#F8FAFC",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                padding: "16px",
                marginBottom: "16px"
              }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#0F172A", marginBottom: "4px" }}>
                  Department Summary & Roster
                </div>
                <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#64748B", lineHeight: "1.5" }}>
                  Generates an institutional audit report with overall departmental standing and faculty-by-faculty score comparisons.
                </p>

                {/* Clean Metrics Strip */}
                <div style={{
                  display: "flex",
                  gap: "16px",
                  padding: "10px 12px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  fontSize: "12.5px"
                }}>
                  <div>
                    <span style={{ color: "#64748B" }}>Overall Rating: </span>
                    <strong style={{
                      color: (analytics.avgRating && parseFloat(analytics.avgRating) < 3.0) ? "#DC2626" : "#0F172A",
                      fontWeight: "600"
                    }}>
                      {analytics.avgRating || "0.00"} / 5.00
                    </strong>
                  </div>
                  <div style={{ color: "#E2E8F0" }}>•</div>
                  <div>
                    <span style={{ color: "#64748B" }}>Faculty Count: </span>
                    <strong style={{ color: "#0F172A", fontWeight: "600" }}>{faculties.length}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleExportDept('excel')}
                  disabled={downloadingType === 'dept-excel'}
                  style={{
                    flex: 1,
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#ffffff",
                    color: "#0F172A",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFC";
                    e.currentTarget.style.borderColor = "#94A3B8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                >
                  {downloadingType === 'dept-excel' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} color="#15803D" />}
                  Download Excel
                </button>

                <button
                  onClick={() => handleExportDept('pdf')}
                  disabled={downloadingType === 'dept-pdf'}
                  style={{
                    flex: 1,
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    borderRadius: "8px",
                    border: "1px solid #0F172A",
                    background: "#0F172A",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#1E293B"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#0F172A"}
                >
                  {downloadingType === 'dept-pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} color="#ffffff" />}
                  Download PDF
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: INDIVIDUAL FACULTY APPRAISAL */
            <div>
              <div style={{
                background: "#F8FAFC",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                padding: "16px",
                marginBottom: "16px"
              }}>
                <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#0F172A", marginBottom: "4px" }}>
                  Individual Faculty Appraisal
                </div>
                <p style={{ margin: "0 0 12px 0", fontSize: "12.5px", color: "#64748B", lineHeight: "1.5" }}>
                  Generates an individual faculty evaluation sheet with course-wise breakdown, radar scores, and signature zones.
                </p>

                {/* Faculty Selector */}
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#475569", marginBottom: "4px" }}>
                    Select Faculty Member:
                  </label>
                  <select
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      padding: "0 10px",
                      borderRadius: "7px",
                      border: "1px solid #CBD5E1",
                      fontSize: "13px",
                      color: "#0F172A",
                      background: "#ffffff",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    {faculties.map((f) => (
                      <option key={f.faculty_id} value={f.faculty_id}>
                        {f.name} ({f.designation || 'Faculty'}) — Avg: {f.avgRating || 'N/A'}/5.00
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Faculty Detail Card */}
                {currentFaculty && (
                  <div style={{
                    padding: "8px 12px",
                    background: "#ffffff",
                    borderRadius: "7px",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12.5px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <User size={14} color="#64748B" />
                      <span style={{ fontWeight: "600", color: "#0F172A" }}>{currentFaculty.name}</span>
                      <span style={{ color: "#94A3B8" }}>• {currentFaculty.designation || 'Faculty'}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748B" }}>Rating: </span>
                      <strong style={{
                        color: (currentFaculty.avgRating !== "N/A" && parseFloat(currentFaculty.avgRating) < 3.0) ? "#DC2626" : "#0F172A",
                        fontWeight: "600"
                      }}>
                        {currentFaculty.avgRating || "N/A"} / 5.00
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => handleExportFaculty('excel')}
                  disabled={downloadingType === 'fac-excel' || facultyLoading}
                  style={{
                    flex: 1,
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    background: "#ffffff",
                    color: "#0F172A",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFC";
                    e.currentTarget.style.borderColor = "#94A3B8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                >
                  {downloadingType === 'fac-excel' ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} color="#15803D" />}
                  Download Excel
                </button>

                <button
                  onClick={() => handleExportFaculty('pdf')}
                  disabled={downloadingType === 'fac-pdf' || facultyLoading}
                  style={{
                    flex: 1,
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    borderRadius: "8px",
                    border: "1px solid #0F172A",
                    background: "#0F172A",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#1E293B"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#0F172A"}
                >
                  {downloadingType === 'fac-pdf' ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} color="#ffffff" />}
                  Download PDF
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 24px",
          background: "#FAFAFA",
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "#94A3B8"
        }}>
          <span>Official format compliant with NBA & NAAC guidelines.</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "12px",
              fontWeight: "500",
              color: "#64748B",
              cursor: "pointer"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#0F172A"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#64748B"}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
