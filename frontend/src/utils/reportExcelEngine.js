import * as XLSX from "xlsx";

// Auto-adjust column widths based on content length
const autoFitColumns = (worksheet, data) => {
  const colWidths = [];
  data.forEach((row) => {
    row.forEach((cell, colIndex) => {
      const cellLength = cell ? String(cell).length : 0;
      colWidths[colIndex] = Math.max(colWidths[colIndex] || 10, cellLength + 3);
    });
  });
  worksheet["!cols"] = colWidths.map((width) => ({ wch: Math.min(width, 50) }));
};

const getPerformanceCategory = (rating) => {
  const num = parseFloat(rating);
  if (isNaN(num)) return "N/A";
  if (num >= 4.5) return "Exemplary (A+)";
  if (num >= 4.0) return "Very Good (A)";
  if (num >= 3.5) return "Good (B+)";
  if (num >= 3.0) return "Satisfactory (B)";
  return "Needs Improvement (C)";
};

/**
 * OPTION 1: DEPARTMENT CONSOLIDATED EXCEL WORKBOOK
 * Exports Overview KPIs & Faculty-by-Faculty Performance Roster
 * (No Active Session info included)
 */
export const exportDepartmentConsolidatedExcel = ({
  deptName,
  dept_id,
  analytics = {},
  faculties = [],
  academicYear = "2025–2026"
}) => {
  const wb = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString("en-IN");

  // Sheet 1: Department Overview (Cleaned: No active sessions)
  const overviewData = [
    ["MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"],
    [`DEPARTMENT OF ${(deptName || dept_id).toUpperCase()}`],
    ["CONSOLIDATED ACADEMIC FEEDBACK AUDIT REPORT"],
    ["Academic Year", academicYear],
    ["Generated On", timestamp],
    [],
    ["METRIC", "VALUE"],
    ["Department Overall Average Rating", `${analytics.avgRating || "0.00"} / 5.00`],
    ["Total Faculty Members Evaluated", faculties.length || 0],
    ["Total Student Feedback Submissions", analytics.totalSubmitted || 0],
    ["Total Registered Students", analytics.totalStudents || 0],
    ["Accreditation Audit Cycle", academicYear]
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoFitColumns(wsOverview, overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Department Overview");

  // Sheet 2: Faculty Roster (One-by-One)
  const rosterData = [
    ["#", "Faculty Name", "Designation", "Official Email", "Average Rating (/5.00)", "Performance Category"]
  ];

  faculties.forEach((f, idx) => {
    const rating = f.avgRating !== undefined && f.avgRating !== "N/A"
      ? parseFloat(f.avgRating).toFixed(2)
      : "N/A";
    rosterData.push([
      idx + 1,
      f.name || "Unknown Faculty",
      f.designation || "Faculty",
      f.email || "—",
      rating !== "N/A" ? parseFloat(rating) : "N/A",
      getPerformanceCategory(rating)
    ]);
  });

  const wsRoster = XLSX.utils.aoa_to_sheet(rosterData);
  autoFitColumns(wsRoster, rosterData);
  XLSX.utils.book_append_sheet(wb, wsRoster, "Faculty Performance");

  const safeDept = (deptName || dept_id).replace(/\s+/g, "_");
  XLSX.writeFile(wb, `MITM_Dept_Consolidated_${safeDept}.xlsx`);
};

/**
 * OPTION 2: INDIVIDUAL FACULTY PERFORMANCE APPRAISAL EXCEL WORKBOOK
 * Exports only that selected faculty's detailed outcomes:
 * Overview, Subject Ratings, and Parameter Breakdown.
 * (No Active Session info included)
 */
export const exportFacultyAppraisalExcel = ({
  facultyProfile = {},
  analytics = {},
  deptName = "Computer Science & Engineering",
  academicYear = "2025–2026"
}) => {
  const wb = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString("en-IN");
  const facultyName = facultyProfile.name || "Faculty Member";
  const overallRating = analytics.avgRating ? parseFloat(analytics.avgRating).toFixed(2) : "0.00";

  // Sheet 1: Profile & KPI Overview (Cleaned: No active sessions)
  const overviewData = [
    ["MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"],
    ["FACULTY ACADEMIC APPRAISAL REPORT"],
    ["Confidential Faculty Performance Audit"],
    ["Academic Year", academicYear],
    ["Generated On", timestamp],
    [],
    ["PARAMETER", "DETAILS"],
    ["Faculty Name", facultyName],
    ["Department", deptName || facultyProfile.dept_name || "N/A"],
    ["Designation", facultyProfile.designation || "Faculty Member"],
    ["Official Email", facultyProfile.email || "N/A"],
    ["Overall Average Rating", `${overallRating} / 5.00`],
    ["Performance Category", getPerformanceCategory(overallRating)],
    ["Total Student Evaluations", analytics.totalFeedback || 0],
    ["Audit Cycle", academicYear]
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  autoFitColumns(wsOverview, overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Appraisal Summary");

  // Sheet 2: Course Breakdown
  const courseData = [
    ["#", "Course Code", "Course Title", "Average Rating (/5.00)", "Performance Category"]
  ];

  (analytics.subjectData || []).forEach((sub, idx) => {
    const score = parseFloat(sub.avg_rating || 0).toFixed(2);
    courseData.push([
      idx + 1,
      sub.course_code || "—",
      sub.course_name || "Course Subject",
      parseFloat(score),
      getPerformanceCategory(score)
    ]);
  });

  const wsCourses = XLSX.utils.aoa_to_sheet(courseData);
  autoFitColumns(wsCourses, courseData);
  XLSX.utils.book_append_sheet(wb, wsCourses, "Course Ratings");

  // Sheet 3: Parameter Questions Breakdown
  const radarData = [
    ["#", "Accreditation Assessment Parameter", "Average Score (/5.00)", "Rating Grade"]
  ];

  (analytics.radarData || []).forEach((q, idx) => {
    const score = parseFloat(q.avg_rating || 0).toFixed(2);
    radarData.push([
      idx + 1,
      q.question || `Parameter ${idx + 1}`,
      parseFloat(score),
      getPerformanceCategory(score)
    ]);
  });

  const wsRadar = XLSX.utils.aoa_to_sheet(radarData);
  autoFitColumns(wsRadar, radarData);
  XLSX.utils.book_append_sheet(wb, wsRadar, "Parameter Breakdown");

  const safeName = facultyName.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `MITM_Faculty_Appraisal_${safeName}.xlsx`);
};
