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
 * Sanitizes a cell value for Excel / SheetJS to prevent Formula Injection (CWE-1236).
 * Prepends a single quote if string starts with formula triggers (=, +, -, @, tab, newline).
 */
export const sanitizeExcelCell = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'number') return val;
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
};

// Creates a worksheet with all cells defensively sanitized against formula injection
const createSafeSheet = (aoaData) => {
  const safeData = aoaData.map((row) => 
    row.map((cell) => sanitizeExcelCell(cell))
  );
  return XLSX.utils.aoa_to_sheet(safeData);
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
    ["MITM ABHIPRAYA - CONSOLIDATED ACADEMIC FEEDBACK AUDIT REPORT"],
    [`DEPARTMENT OF ${(deptName || dept_id).toUpperCase()}`],
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

  const wsOverview = createSafeSheet(overviewData);
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

  const wsRoster = createSafeSheet(rosterData);
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

  const wsOverview = createSafeSheet(overviewData);
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

  const wsCourses = createSafeSheet(courseData);
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

  const wsRadar = createSafeSheet(radarData);
  autoFitColumns(wsRadar, radarData);
  XLSX.utils.book_append_sheet(wb, wsRadar, "Parameter Breakdown");

  const safeName = facultyName.replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `MITM_Faculty_Appraisal_${safeName}.xlsx`);
};

/**
 * OPTION 3: CONSOLIDATED SESSION FEEDBACK EXCEL WORKBOOK
 * Scoped strictly to session_id:
 * - Sheet 1: Session Demographics, KPI Overview & Student Turnout (%)
 * - Sheet 2: Faculty-by-Faculty Consolidated Scorecards
 * - Sheet 3: Question-by-Question Parameter Breakdown
 */
export const exportSessionConsolidatedExcel = ({
  session = {},
  turnout = {},
  sessionOverallRating = "0.00",
  faculties = [],
  questionBreakdown = [],
  comparativeMatrix = [],
  academicYear = "2025–2026"
}) => {
  const wb = XLSX.utils.book_new();
  const timestamp = new Date().toLocaleString("en-IN");

  // Sheet 1: Master Detailed Question-by-Question Breakdown for Each Faculty (FIRST SHEET)
  const granularQuestionData = [
    ["MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"],
    [`DEPARTMENT OF ${(session.dept_name || session.dept_id || "ACADEMICS").toUpperCase()}`],
    ["DETAILED FACULTY FEEDBACK EVALUATION REPORT"],
    ["Session ID", `#${session.session_id}`],
    ["Target Class Cohort", `Semester ${session.sem} — Section ${session.section || "A"}`],
    ["Academic Year", session.academic_year || academicYear],
    ["Generated On", timestamp],
    [],
    [
      "#",
      "Faculty ID",
      "Faculty Name",
      "Designation",
      "Course Code",
      "Subject Title",
      "Q#",
      "Accreditation Section",
      "Question Parameter Description",
      "Average Rating (/5.00)",
      "Score %",
      "Performance Grade"
    ]
  ];

  let qDetailCounter = 1;
  faculties.forEach((f) => {
    const questionsToUse = (f.questions && f.questions.length > 0)
      ? f.questions
      : (questionBreakdown || []).map((qb, qbIdx) => ({
          question_number: qb.question_number || qbIdx + 1,
          question_text: qb.question_text,
          question_heading: qb.question_heading,
          avg_rating: f.avg_rating || "0.00",
          score_percentage: f.score_percentage || ((parseFloat(f.avg_rating || 0) / 5) * 100).toFixed(1),
          performance_category: f.performance_category || getPerformanceCategory(f.avg_rating)
        }));

    questionsToUse.forEach((q, qIdx) => {
      const qRating = parseFloat(q.avg_rating || 0);
      const qPct = q.score_percentage || ((qRating / 5) * 100).toFixed(1);
      granularQuestionData.push([
        qDetailCounter++,
        f.faculty_id || "—",
        f.name || "Unknown",
        f.designation || "Faculty",
        f.course_code || "—",
        f.course_name || "—",
        `Q${q.question_number || qIdx + 1}`,
        q.question_heading || "General",
        q.question_text || "Parameter",
        qRating,
        `${qPct}%`,
        q.performance_category || getPerformanceCategory(q.avg_rating)
      ]);
    });
  });

  const wsGranular = createSafeSheet(granularQuestionData);
  autoFitColumns(wsGranular, granularQuestionData);
  XLSX.utils.book_append_sheet(wb, wsGranular, "Detailed Faculty Report");

  // Sheet 2: Advanced Comparative Matrix (Side-by-Side Faculty Comparison)
  const matrixSource = (comparativeMatrix && comparativeMatrix.length > 0) ? comparativeMatrix : questionBreakdown;
  if (matrixSource && matrixSource.length > 0) {
    const matrixHeader = [
      ["MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"],
      ["MASTER COMPARATIVE EVALUATION MATRIX (ALL FACULTY MEMBERS)"],
      [`Session #${session.session_id} • Semester ${session.sem} Section ${session.section || "A"}`],
      [],
      [
        "Q#",
        "Accreditation Section",
        "Evaluation Parameter / Question",
        ...faculties.map(f => `${f.name} (${f.course_code})`),
        "Session Mean (/5.00)"
      ]
    ];

    const matrixData = [...matrixHeader];

    matrixSource.forEach((q, idx) => {
      const row = [
        `Q${q.question_number || idx + 1}`,
        q.question_heading || "General",
        q.question_text
      ];

      // Insert each faculty's specific score for this question
      faculties.forEach((f) => {
        if (q.faculty_scores) {
          const fs = q.faculty_scores.find(s => s.faculty_id === f.faculty_id && s.course_code === f.course_code);
          row.push(fs ? parseFloat(fs.avg_rating || 0) : 0);
        } else {
          const foundQ = (f.questions || []).find(fq => fq.question_id === q.question_id);
          row.push(foundQ ? parseFloat(foundQ.avg_rating || 0) : 0);
        }
      });

      // Add overall session average for this question
      row.push(parseFloat(q.session_avg || q.avg_rating || 0));
      matrixData.push(row);
    });

    const wsMatrix = createSafeSheet(matrixData);
    autoFitColumns(wsMatrix, matrixData);
    XLSX.utils.book_append_sheet(wb, wsMatrix, "Comparative Faculty Matrix");
  }

  // Sheet 3: Faculty Scorecards Overview Summary
  const facultyData = [
    [
      "#",
      "Faculty ID",
      "Faculty Name",
      "Designation",
      "Official Email",
      "Course Code",
      "Subject Title",
      "Average Rating (/5.00)",
      "Score %",
      "Performance Grade",
      "Evaluated Responses",
      "Excellent (5)",
      "Good (4)",
      "Average (3)",
      "Poor (<=2)"
    ]
  ];

  faculties.forEach((f, idx) => {
    const ratingNum = parseFloat(f.avg_rating || 0);
    const pct = f.score_percentage || ((ratingNum / 5) * 100).toFixed(1);
    facultyData.push([
      idx + 1,
      f.faculty_id || "—",
      f.name || "Unknown",
      f.designation || "Faculty",
      f.email || "—",
      f.course_code || "—",
      f.course_name || "—",
      ratingNum,
      `${pct}%`,
      f.performance_category || getPerformanceCategory(f.avg_rating),
      f.feedbacks_count || turnout.completed_students || 0,
      f.distribution?.excellent || 0,
      f.distribution?.good || 0,
      f.distribution?.average || 0,
      f.distribution?.poor || 0
    ]);
  });

  const wsFaculty = createSafeSheet(facultyData);
  autoFitColumns(wsFaculty, facultyData);
  XLSX.utils.book_append_sheet(wb, wsFaculty, "Faculty Scorecards Summary");

  // Sheet 4: Faculty Section-by-Section Performance Breakdown
  const sectionData = [
    [
      "#",
      "Faculty ID",
      "Faculty Name",
      "Designation",
      "Course Code",
      "Subject Title",
      "Accreditation Section",
      "Section Average (/5.00)",
      "Score %",
      "Rating Grade",
      "Parameters Count"
    ]
  ];

  let secCounter = 1;
  faculties.forEach((f) => {
    (f.sections || []).forEach((sec) => {
      const sRating = parseFloat(sec.avg_rating || 0);
      const sPct = sec.score_percentage || ((sRating / 5) * 100).toFixed(1);
      sectionData.push([
        secCounter++,
        f.faculty_id || "—",
        f.name || "Unknown",
        f.designation || "Faculty",
        f.course_code || "—",
        f.course_name || "—",
        sec.heading || "General Section",
        sRating,
        `${sPct}%`,
        sec.performance_category || getPerformanceCategory(sec.avg_rating),
        sec.questions_count || 0
      ]);
    });
  });

  const wsSections = createSafeSheet(sectionData);
  autoFitColumns(wsSections, sectionData);
  XLSX.utils.book_append_sheet(wb, wsSections, "Faculty Section Analysis");

  // Sheet 5: Session Overview & Turnout Metrics
  const overviewData = [
    ["MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE"],
    [`DEPARTMENT OF ${(session.dept_name || session.dept_id || "ACADEMICS").toUpperCase()}`],
    ["SESSION FEEDBACK AUDIT & TURNOUT REPORT"],
    ["Session ID", `#${session.session_id}`],
    ["Target Class Cohort", `Semester ${session.sem} — Section ${session.section || "A"}`],
    ["Academic Cycle", session.academic_year || academicYear],
    ["Generated On", timestamp],
    [],
    ["AUDIT METRIC", "VALUE", "EVALUATION BENCHMARK"],
    ["Total Registered Students in Class", turnout.total_students || 0, "Class Enrolled Roster"],
    ["Total Student Submissions Completed", turnout.completed_students || 0, "Verified Submissions"],
    ["Student Feedback Turnout Rate (%)", `${turnout.turnout_percentage || 0}%`, turnout.turnout_percentage >= 75 ? "Optimal High Turnout (>=75%)" : "Active Turnout"],
    ["Pending / Non-Responding Students", turnout.pending_students || 0, "Awaiting Submission"],
    ["Session Overall Faculty Rating", `${sessionOverallRating || "0.00"} / 5.00`, getPerformanceCategory(sessionOverallRating)],
    ["Total Faculty Members Evaluated", faculties.length || 0, "Assigned Teachers in Session"]
  ];

  const wsOverview = createSafeSheet(overviewData);
  autoFitColumns(wsOverview, overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, "Session Overview & Turnout");

  const safeSessionId = String(session.session_id || "Session").replace(/[^a-zA-Z0-9]/g, "_");
  XLSX.writeFile(wb, `MITM_Session_${safeSessionId}_Detailed_Report.xlsx`);
};
