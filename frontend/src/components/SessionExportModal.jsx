import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  FileText, FileSpreadsheet, X, Calendar, Users, Star,
  Loader2, CheckCircle2, AlertCircle, ArrowDownToLine,
  ChevronDown, ChevronUp, Layers, Table
} from "lucide-react";
import apiClient from "../services/apiClient";
import { generateSessionConsolidatedPdf } from "../utils/reportPdfEngine";
import { exportSessionConsolidatedExcel } from "../utils/reportExcelEngine";

export default function SessionExportModal({
  isOpen,
  onClose,
  sessionId
}) {
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState(null); // 'pdf' or 'excel'
  const [reportData, setReportData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const [activeTab, setActiveTab] = useState("faculty"); // "faculty" | "matrix"

  useEffect(() => {
    let isMounted = true;
    if (isOpen && sessionId) {
      setLoading(true);
      setFetchError(null);
      apiClient.get(`/sessions/${sessionId}/report-data`, { withCredentials: true })
        .then((res) => {
          if (isMounted) {
            setReportData(res.data);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load session report data:", err);
          if (isMounted) {
            setFetchError(err.response?.data?.error || "Failed to load session report details.");
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const session = reportData?.session || {};
  const turnout = reportData?.turnout || {};
  const overallRating = reportData?.sessionOverallRating || "0.00";
  const faculties = reportData?.faculties || [];
  const questionBreakdown = reportData?.questionBreakdown || [];
  const comparativeMatrix = reportData?.comparativeMatrix || [];

  const turnoutPct = parseFloat(turnout.turnout_percentage || 0);
  const turnoutColor = turnoutPct >= 75 ? "#16A34A" : turnoutPct >= 40 ? "#2563EB" : "#D97706";
  const turnoutBg = turnoutPct >= 75 ? "#DCFCE7" : turnoutPct >= 40 ? "#DBEAFE" : "#FEF3C7";

  const handleExportPdf = async () => {
    if (!reportData) return;
    try {
      setDownloadingFormat("pdf");
      await generateSessionConsolidatedPdf({
        session,
        turnout,
        sessionOverallRating: overallRating,
        faculties,
        questionBreakdown,
        comparativeMatrix,
        academicYear: session.academic_year || "2025–2026"
      });
      toast.success(`Session #${sessionId} Detailed PDF downloaded successfully`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate session PDF report");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    try {
      setDownloadingFormat("excel");
      exportSessionConsolidatedExcel({
        session,
        turnout,
        sessionOverallRating: overallRating,
        faculties,
        questionBreakdown,
        comparativeMatrix,
        academicYear: session.academic_year || "2025–2026"
      });
      toast.success(`Session #${sessionId} Detailed Excel downloaded successfully`);
    } catch (err) {
      console.error("Excel generation error:", err);
      toast.error("Failed to generate session Excel report");
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: "16px"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "660px",
          maxHeight: "min(94vh, 750px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
          border: "1px solid #E2E8F0"
        }}
      >
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
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#EFF6FF",
              border: "1px solid #DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1E3A8A"
            }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0F172A" }}>
                Session Feedback Report
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "#64748B" }}>
                Session #{sessionId} • {session.dept_name || session.dept_id || "Department"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              width: "34px",
              height: "34px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#0F172A";
              e.currentTarget.style.borderColor = "#CBD5E1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F8FAFC";
              e.currentTarget.style.color = "#64748B";
              e.currentTarget.style.borderColor = "#E2E8F0";
            }}
            aria-label="Close modal"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <Loader2 className="spinner" size={28} color="#2563EB" style={{ margin: "0 auto 12px auto" }} />
              <p style={{ margin: 0, fontSize: "14px", color: "#64748B", fontWeight: "500" }}>
                Aggregating session faculty scores & student turnout...
              </p>
            </div>
          ) : fetchError ? (
            <div style={{
              padding: "24px",
              background: "#FEF2F2",
              borderRadius: "12px",
              border: "1px solid #FEE2E2",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start"
            }}>
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h4 style={{ margin: "0 0 4px 0", color: "#991B1B", fontSize: "14px" }}>Error Loading Session Report</h4>
                <p style={{ margin: 0, fontSize: "13px", color: "#B91C1C" }}>{fetchError}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Turnout & KPI Summary Card */}
              <div style={{
                background: "#F8FAFC",
                borderRadius: "14px",
                border: "1px solid #E2E8F0",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Users size={15} color="#475569" />
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                      Student Turnout Rate
                    </span>
                  </div>
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    background: turnoutBg,
                    color: turnoutColor
                  }}>
                    {turnout.turnout_percentage || 0}% Completed
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ height: "8px", width: "100%", background: "#E2E8F0", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(turnoutPct, 100)}%`,
                      background: turnoutColor,
                      borderRadius: "99px",
                      transition: "width 0.4s ease"
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "12px", color: "#64748B" }}>
                    <span>{turnout.completed_students || 0} of {turnout.total_students || 0} Students Submitted</span>
                    <span>{turnout.pending_students || 0} Non-responding</span>
                  </div>
                </div>

                {/* KPI Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  paddingTop: "8px",
                  borderTop: "1px solid #E2E8F0"
                }}>
                  <div>
                    <span style={{ fontSize: "11.5px", color: "#64748B", fontWeight: "500", textTransform: "uppercase" }}>
                      Session Average Rating
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "2px" }}>
                      <Star size={16} fill="#F59E0B" color="#F59E0B" />
                      <span style={{ fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>
                        {overallRating} <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748B" }}>/ 5.00</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "11.5px", color: "#64748B", fontWeight: "500", textTransform: "uppercase" }}>
                      Target Cohort
                    </span>
                    <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#0F172A", marginTop: "2px" }}>
                      Semester {session.sem} • Section {session.section || "A"}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs (Faculty Detail vs Comparative Matrix) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ display: "flex", gap: "6px", background: "#F1F5F9", padding: "3px", borderRadius: "10px" }}>
                    <button
                      onClick={() => setActiveTab("faculty")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        background: activeTab === "faculty" ? "#ffffff" : "transparent",
                        color: activeTab === "faculty" ? "#0F172A" : "#64748B",
                        boxShadow: activeTab === "faculty" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Users size={13} />
                      Faculty Detail ({faculties.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("matrix")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        background: activeTab === "matrix" ? "#ffffff" : "transparent",
                        color: activeTab === "matrix" ? "#0F172A" : "#64748B",
                        boxShadow: activeTab === "matrix" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Table size={13} />
                      Comparative Matrix
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>
                    {activeTab === "faculty" ? "Click to view questions & section ratings" : "Side-by-side faculty comparison"}
                  </span>
                </div>

                {activeTab === "faculty" ? (
                  <div style={{
                    maxHeight: "240px",
                    overflowY: "auto",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    background: "#ffffff"
                  }}>
                    {faculties.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#94A3B8" }}>
                        No faculty feedback data registered for this session.
                      </div>
                    ) : (
                      faculties.map((f, idx) => {
                        const fKey = `${f.faculty_id || idx}_${f.course_id || idx}`;
                        const isExpanded = expandedFaculty === fKey;
                        const ratingNum = parseFloat(f.avg_rating || 0);
                        const pct = f.score_percentage || ((ratingNum / 5) * 100).toFixed(1);

                        return (
                          <div
                            key={fKey}
                            style={{
                              borderBottom: idx < faculties.length - 1 ? "1px solid #F1F5F9" : "none",
                              transition: "background 0.15s ease"
                            }}
                          >
                            {/* Header Clickable Row */}
                            <div
                              onClick={() => setExpandedFaculty(isExpanded ? null : fKey)}
                              style={{
                                padding: "10px 14px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                cursor: "pointer",
                                background: isExpanded ? "#F8FAFC" : "transparent",
                                transition: "background 0.15s ease"
                              }}
                              onMouseEnter={(e) => {
                                if (!isExpanded) e.currentTarget.style.background = "#F8FAFC";
                              }}
                              onMouseLeave={(e) => {
                                if (!isExpanded) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, paddingRight: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {f.name}
                                  </span>
                                  {f.designation && (
                                    <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: "400" }}>
                                      ({f.designation})
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "11.5px", color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {f.course_code} — {f.course_name}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                <span style={{
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  color: ratingNum >= 4.0 ? "#166534" : ratingNum >= 3.0 ? "#B45309" : "#B91C1C",
                                  background: ratingNum >= 4.0 ? "#DCFCE7" : ratingNum >= 3.0 ? "#FEF3C7" : "#FEE2E2",
                                  border: `1px solid ${ratingNum >= 4.0 ? "#BBF7D0" : ratingNum >= 3.0 ? "#FDE68A" : "#FECACA"}`,
                                  padding: "2px 8px",
                                  borderRadius: "6px"
                                }}>
                                  ★ {f.avg_rating} <span style={{ fontSize: "10.5px", fontWeight: "500", opacity: 0.9 }}>({pct}%)</span>
                                </span>
                                <span style={{ color: "#94A3B8", display: "flex", alignItems: "center" }}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Details Panel */}
                            {isExpanded && (
                              <div style={{
                                padding: "12px 14px 14px 14px",
                                background: "#F8FAFC",
                                borderTop: "1px dashed #E2E8F0",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                              }}>
                                {/* Section Averages */}
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                    <Layers size={13} color="#475569" />
                                    <span style={{ fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px" }}>
                                      Accreditation Section Averages
                                    </span>
                                  </div>
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                                    gap: "6px"
                                  }}>
                                    {(f.sections || []).map((sec, sIdx) => {
                                      const sVal = parseFloat(sec.avg_rating || 0);
                                      const sPct = sec.score_percentage || ((sVal / 5) * 100).toFixed(1);
                                      const sColor = sVal >= 4.0 ? "#166534" : sVal >= 3.0 ? "#B45309" : "#B91C1C";
                                      const sBg = sVal >= 4.0 ? "#F0FDF4" : sVal >= 3.0 ? "#FFFBEB" : "#FEF2F2";
                                      const sBorder = sVal >= 4.0 ? "#DCFCE7" : sVal >= 3.0 ? "#FEF3C7" : "#FEE2E2";
                                      return (
                                        <div key={sIdx} style={{
                                          padding: "6px 8px",
                                          background: sBg,
                                          border: `1px solid ${sBorder}`,
                                          borderRadius: "8px",
                                          display: "flex",
                                          flexDirection: "column"
                                        }}>
                                          <span style={{
                                            fontSize: "10px",
                                            fontWeight: "600",
                                            color: "#64748B",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis"
                                          }} title={sec.heading}>
                                            {sec.heading}
                                          </span>
                                          <span style={{ fontSize: "12px", fontWeight: "700", color: sColor, marginTop: "2px" }}>
                                            ★ {sec.avg_rating} <span style={{ fontSize: "10px", fontWeight: "500", color: "#64748B" }}>({sPct}%)</span>
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Granular Question Breakdown */}
                                {f.questions && f.questions.length > 0 && (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", marginTop: "2px" }}>
                                      <span style={{ fontSize: "10.5px", fontWeight: "700", textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px" }}>
                                        Question-Level Ratings ({f.questions.length} Items)
                                      </span>
                                      <span style={{ fontSize: "10px", color: "#94A3B8" }}>
                                        {f.total_responses || f.feedbacks_count || 0} student evaluations
                                      </span>
                                    </div>
                                    <div style={{
                                      maxHeight: "140px",
                                      overflowY: "auto",
                                      border: "1px solid #E2E8F0",
                                      borderRadius: "8px",
                                      background: "#ffffff"
                                    }}>
                                      {f.questions.map((q, qIdx) => {
                                        const qVal = parseFloat(q.avg_rating || 0);
                                        const qPct = q.score_percentage || ((qVal / 5) * 100).toFixed(1);
                                        const qColor = qVal >= 4.0 ? "#166534" : qVal >= 3.0 ? "#B45309" : "#B91C1C";
                                        return (
                                          <div
                                            key={q.question_id || qIdx}
                                            style={{
                                              padding: "6px 10px",
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              gap: "8px",
                                              borderBottom: qIdx < f.questions.length - 1 ? "1px solid #F8FAFC" : "none",
                                              fontSize: "11px"
                                            }}
                                          >
                                            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
                                              <span style={{
                                                fontWeight: "700",
                                                color: "#475569",
                                                fontSize: "10px",
                                                flexShrink: 0,
                                                background: "#F1F5F9",
                                                padding: "1px 5px",
                                                borderRadius: "4px"
                                              }}>
                                                Q{q.question_number || qIdx + 1}
                                              </span>
                                              <span style={{
                                                color: "#334155",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis"
                                              }} title={q.question_text}>
                                                {q.question_text}
                                              </span>
                                            </div>
                                            <span style={{
                                              fontWeight: "700",
                                              color: qColor,
                                              flexShrink: 0,
                                              fontSize: "11px"
                                            }}>
                                              ★ {q.avg_rating} <span style={{ fontSize: "10px", fontWeight: "400", color: "#94A3B8" }}>({qPct}%)</span>
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* Master Comparative Matrix Tab */
                  <div style={{
                    maxHeight: "240px",
                    overflow: "auto",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    background: "#ffffff"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                      <thead>
                        <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", position: "sticky", top: 0, zIndex: 1 }}>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#475569", width: "40px" }}>Q#</th>
                          <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "700", color: "#475569", minWidth: "170px" }}>Evaluation Parameter</th>
                          {faculties.map((f, fIdx) => (
                            <th key={fIdx} style={{ padding: "8px 10px", textAlign: "center", fontWeight: "700", color: "#1E3A8A", minWidth: "95px" }}>
                              {f.name}<br /><span style={{ fontSize: "9.5px", fontWeight: "500", color: "#64748B" }}>({f.course_code})</span>
                            </th>
                          ))}
                          <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "700", color: "#0F172A", width: "65px" }}>Class Mean</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(comparativeMatrix.length > 0 ? comparativeMatrix : questionBreakdown).map((row, rIdx) => {
                          const meanNum = parseFloat(row.session_avg || row.avg_rating || 0);
                          return (
                            <tr key={rIdx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                              <td style={{ padding: "7px 10px", fontWeight: "700", color: "#64748B" }}>Q{row.question_number || rIdx + 1}</td>
                              <td style={{ padding: "7px 10px", color: "#1E293B" }}>
                                <div style={{ fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "220px" }} title={row.question_text}>
                                  {row.question_text}
                                </div>
                                <div style={{ fontSize: "9.5px", color: "#94A3B8" }}>{row.question_heading}</div>
                              </td>
                              {faculties.map((f, fIdx) => {
                                let score = "0.00";
                                if (row.faculty_scores) {
                                  const match = row.faculty_scores.find(s => s.faculty_id === f.faculty_id && s.course_code === f.course_code);
                                  if (match) score = match.avg_rating;
                                } else {
                                  const found = (f.questions || []).find(q => q.question_id === row.question_id);
                                  if (found) score = found.avg_rating;
                                }
                                const scoreNum = parseFloat(score);
                                const scoreColor = scoreNum >= 4.0 ? "#166534" : scoreNum >= 3.0 ? "#B45309" : "#B91C1C";
                                const scoreBg = scoreNum >= 4.0 ? "#DCFCE7" : scoreNum >= 3.0 ? "#FEF3C7" : "#FEE2E2";
                                return (
                                  <td key={fIdx} style={{ padding: "7px 10px", textAlign: "center" }}>
                                    <span style={{
                                      fontSize: "11px",
                                      fontWeight: "700",
                                      color: scoreColor,
                                      background: scoreBg,
                                      padding: "2px 6px",
                                      borderRadius: "5px"
                                    }}>
                                      {score}
                                    </span>
                                  </td>
                                );
                              })}
                              <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: "700", color: "#0F172A" }}>
                                {meanNum.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Export Format Action Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "4px" }}>
                {/* PDF Button */}
                <button
                  onClick={handleExportPdf}
                  disabled={downloadingFormat !== null}
                  className="btn hoverable"
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #CBD5E1",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    cursor: downloadingFormat ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                  }}
                  onMouseEnter={(e) => {
                    if (!downloadingFormat) {
                      e.currentTarget.style.borderColor = "#2563EB";
                      e.currentTarget.style.background = "#F8FAFC";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!downloadingFormat) {
                      e.currentTarget.style.borderColor = "#CBD5E1";
                      e.currentTarget.style.background = "#ffffff";
                    }
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#FEF2F2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#DC2626"
                  }}>
                    {downloadingFormat === "pdf" ? <Loader2 size={18} className="spinner" /> : <FileText size={20} />}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A" }}>
                      {downloadingFormat === "pdf" ? "Building PDF..." : "Export Official PDF"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Institutional Format</div>
                  </div>
                </button>

                {/* Excel Button */}
                <button
                  onClick={handleExportExcel}
                  disabled={downloadingFormat !== null}
                  className="btn hoverable"
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #CBD5E1",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    cursor: downloadingFormat ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                  }}
                  onMouseEnter={(e) => {
                    if (!downloadingFormat) {
                      e.currentTarget.style.borderColor = "#16A34A";
                      e.currentTarget.style.background = "#F8FAFC";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!downloadingFormat) {
                      e.currentTarget.style.borderColor = "#CBD5E1";
                      e.currentTarget.style.background = "#ffffff";
                    }
                  }}
                >
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "#F0FDF4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#16A34A"
                  }}>
                    {downloadingFormat === "excel" ? <Loader2 size={18} className="spinner" /> : <FileSpreadsheet size={20} />}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#0F172A" }}>
                      {downloadingFormat === "excel" ? "Generating..." : "Export Excel (.xlsx)"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Multi-Sheet Workbook</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
