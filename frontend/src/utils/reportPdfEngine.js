import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to load an image URL as Base64 for jsPDF
const getBase64Image = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Logo could not be loaded for PDF", e);
    return null;
  }
};

// Formats performance grade based on 5-point rating scale
const getPerformanceCategory = (rating) => {
  const num = parseFloat(rating);
  if (isNaN(num)) return "N/A";
  if (num >= 4.5) return "Exemplary (A+)";
  if (num >= 4.0) return "Very Good (A)";
  if (num >= 3.5) return "Good (B+)";
  if (num >= 3.0) return "Satisfactory (B)";
  return "Needs Improvement (C)";
};

// Enhanced Header for MIT Mysore Official Documents
const addCollegeHeader = async (doc, titleText, subtitleText) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Stripe (Deep Navy + Gold)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(0, 0, pageWidth, 4, 'F');
  doc.setFillColor(217, 119, 6); // #D97706 Gold
  doc.rect(0, 3.2, pageWidth, 0.8, 'F');

  // Try loading logo
  const logoBase64 = await getBase64Image('/logo.jpeg');
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 14, 8, 22, 22);
    } catch (e) {
      console.warn("Failed to insert logo image", e);
    }
  }

  // Institution Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.text("MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE", 39, 15);

  // Accreditations Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105); // #475569 Slate Grey
  doc.text("Affiliated to VTU Belagavi | Approved by AICTE, New Delhi | Accredited by NBA & NAAC", 39, 20);
  doc.text("An ISO 9001:2015 Certified Institution • Mandya / Mysore, Karnataka", 39, 24);

  // Document Title Text
  if (titleText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // #0F172A Deep Slate / Charcoal
    doc.text(titleText.toUpperCase(), 39, 29.5);
  }

  if (subtitleText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitleText, 39, 34);
  }

  // Dual-tone Accent Divider Line
  const lineY = subtitleText ? 37 : 33;
  doc.setDrawColor(30, 58, 138); // Royal Navy
  doc.setLineWidth(1.2);
  doc.line(14, lineY, pageWidth - 14, lineY);

  doc.setDrawColor(217, 119, 6); // Gold Accent
  doc.setLineWidth(0.4);
  doc.line(14, lineY + 1.2, pageWidth - 14, lineY + 1.2);

  return lineY + 5;
};

// Add standard footer with page numbers
const addFooters = (doc) => {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text("Maharaja Institute of Technology Mysore • Official Academic Feedback Audit Record", 14, pageHeight - 7);
    doc.text(`Generated on: ${timestamp}  |  Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  }
};

/**
 * OPTION 1: DEPARTMENT CONSOLIDATED PDF REPORT
 * Exports Entire Department Average + Faculty One-by-One Table
 * (No Active Session references included)
 */
export const generateDepartmentConsolidatedPdf = async ({
  deptName,
  dept_id,
  analytics = {},
  faculties = [],
  academicYear = "2025–2026"
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const startY = await addCollegeHeader(
    doc,
    "CONSOLIDATED ACADEMIC EVALUATION REPORT"
  );

  // 1. Department Summary Cards Box (Cleaned: No Faculty or Student counts)
  autoTable(doc, {
    startY: startY,
    head: [[
      "Department / Program",
      "Department Overall Rating",
      "Performance Benchmark",
      "Academic Evaluation Year"
    ]],
    body: [[
      `Dept. of ${deptName || dept_id}`,
      `${analytics.avgRating || "0.00"} / 5.00`,
      getPerformanceCategory(analytics.avgRating),
      academicYear
    ]],
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: "center",
      font: "helvetica",
      textColor: [15, 23, 42]
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 10.5,
      fontStyle: "bold",
      textColor: [30, 58, 138]
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.3,
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 1 || data.column.index === 2)) {
        const num = parseFloat(analytics.avgRating);
        if (!isNaN(num) && num <= 3.0) {
          data.cell.styles.textColor = [220, 38, 38]; // Bold Red for < 3.0
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  // Section Heading
  const tableStartY = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Faculty Performance Roster (One-by-One Evaluation)", 14, tableStartY);

  // 2. Faculty One-by-One Table
  const facultyRows = faculties.map((f, index) => {
    const rating = f.avgRating !== undefined && f.avgRating !== "N/A" 
      ? parseFloat(f.avgRating).toFixed(2) 
      : "N/A";
    return [
      index + 1,
      f.name || "Unknown Faculty",
      f.designation || "Faculty",
      f.email || "—",
      rating !== "N/A" ? `${rating} / 5.00` : "No Ratings Yet",
      getPerformanceCategory(rating)
    ];
  });

  autoTable(doc, {
    startY: tableStartY + 3,
    head: [["#", "Faculty Name", "Designation", "Official Email", "Average Rating", "Performance Category"]],
    body: facultyRows.length > 0 ? facultyRows : [["—", "No faculty registered in department", "—", "—", "—", "—"]],
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      font: "helvetica"
    },
    headStyles: {
      fillColor: [30, 58, 138], // Royal Navy
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { fontStyle: "bold" },
      4: { halign: "center", fontStyle: "bold", textColor: [30, 58, 138] },
      5: { halign: "center" }
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const ratingStr = String(data.row.raw[4] || "");
        const num = parseFloat(ratingStr);
        if (!isNaN(num) && num < 3.0) {
          if (data.column.index === 4 || data.column.index === 5) {
            data.cell.styles.textColor = [220, 38, 38]; // Bold Red for ratings below 3
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    }
  });

  // 3. Institutional Sign-off Block
  let finalY = doc.lastAutoTable.finalY + 18;
  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = 30;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  // Signature Dotted Lines
  const col1X = 20;
  const col2X = pageWidth - 65;

  doc.text("......................................................", col1X, finalY);
  doc.text("Head of Department (HOD)", col1X + 5, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.text(`Dept. of ${deptName || dept_id}`, col1X + 5, finalY + 9);

  doc.setFont("helvetica", "normal");
  doc.text("......................................................", col2X, finalY);
  doc.text("Principal / Academic Dean", col2X + 5, finalY + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Maharaja Institute of Technology Mysore", col2X + 5, finalY + 9);

  // Add Footers to all pages
  addFooters(doc);

  // Save the PDF
  const filename = `MITM_Dept_Consolidated_Report_${(deptName || dept_id).replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

/**
 * OPTION 2: INDIVIDUAL FACULTY PERFORMANCE APPRAISAL PDF
 * Exports only that selected faculty's detailed outcomes:
 * Course breakdown, 5-Pillar Radar scores, qualitative student remarks & 3 signature blocks.
 * (No Active Session references included)
 */
export const generateFacultyAppraisalPdf = async ({
  facultyProfile = {},
  analytics = {},
  deptName = "Computer Science & Engineering",
  academicYear = "2025–2026"
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const facultyName = facultyProfile.name || "Faculty Member";

  const startY = await addCollegeHeader(
    doc,
    "FACULTY ACADEMIC APPRAISAL & EVALUATION REPORT"
  );

  // 1. Faculty Metadata Profile Card (No active session status)
  const overallRating = analytics.avgRating ? parseFloat(analytics.avgRating).toFixed(2) : "0.00";
  const grade = getPerformanceCategory(overallRating);

  autoTable(doc, {
    startY: startY,
    head: [["Faculty Profile Details", "Appraisal Summary"]],
    body: [
      [
        `Faculty Name: ${facultyName}\nDepartment: ${deptName || facultyProfile.dept_name || 'N/A'}\nDesignation: ${facultyProfile.designation || 'Faculty Member'}\nEmail: ${facultyProfile.email || 'N/A'}`,
        `Overall Score: ${overallRating} / 5.00\nPerformance Grade: ${grade}\nInstitutional Standing: Accredited\nAudit Cycle: Academic Year ${academicYear}`
      ]
    ],
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      font: "helvetica",
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.3
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 58, 138],
      fontStyle: "bold"
    },
    columnStyles: {
      1: { fontStyle: "bold", halign: "left" }
    }
  });

  // 2. Course-wise Performance Breakdown
  const subjectStartY = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Course Evaluation & Subject-Wise Performance", 14, subjectStartY);

  const subjectRows = (analytics.subjectData || []).map((sub, idx) => {
    const score = parseFloat(sub.avg_rating || 0).toFixed(2);
    return [
      idx + 1,
      sub.course_code || "—",
      sub.course_name || "Course Subject",
      `${score} / 5.00`,
      getPerformanceCategory(score)
    ];
  });

  autoTable(doc, {
    startY: subjectStartY + 2.5,
    head: [["#", "Course Code", "Course Title", "Average Rating", "Performance Category"]],
    body: subjectRows.length > 0 ? subjectRows : [["—", "—", "No individual course feedback recorded yet", "—", "—"]],
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      font: "helvetica",
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      3: { halign: "center", fontStyle: "bold", textColor: [30, 58, 138] },
      4: { halign: "center" }
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const scoreStr = String(data.row.raw[3] || "");
        const num = parseFloat(scoreStr);
        if (!isNaN(num) && num < 3.0) {
          if (data.column.index === 3 || data.column.index === 4) {
            data.cell.styles.textColor = [220, 38, 38]; // Bold Red for courses below 3
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    }
  });

  // 3. Teaching Quality Parameter Breakdown (Radar / Questions)
  const radarStartY = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Teaching Quality & Accreditation Parameter Breakdown (NBA / NAAC)", 14, radarStartY);

  const radarRows = (analytics.radarData || []).map((q, idx) => {
    const score = parseFloat(q.avg_rating || 0).toFixed(2);
    return [
      idx + 1,
      q.question || `Parameter ${idx + 1}`,
      `${score} / 5.00`,
      getPerformanceCategory(score)
    ];
  });

  autoTable(doc, {
    startY: radarStartY + 2.5,
    head: [["#", "Assessment Parameter / Question", "Score", "Rating Grade"]],
    body: radarRows.length > 0 ? radarRows : [["—", "General Pedagogical Evaluation", `${overallRating} / 5.00`, grade]],
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      font: "helvetica",
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "center" }
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const scoreStr = String(data.row.raw[2] || "");
        const num = parseFloat(scoreStr);
        if (!isNaN(num) && num < 3.0) {
          if (data.column.index === 2 || data.column.index === 3) {
            data.cell.styles.textColor = [220, 38, 38]; // Bold Red for parameters below 3
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    }
  });

  // 4. Tripartite Formal Signature Blocks
  let finalY = doc.lastAutoTable.finalY + 18;
  if (finalY > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    finalY = 30;
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const s1 = 16;
  const s2 = (pageWidth / 2) - 25;
  const s3 = pageWidth - 65;

  doc.text("............................................", s1, finalY);
  doc.text("Faculty Signature", s1 + 4, finalY + 4.5);
  doc.setFont("helvetica", "bold");
  doc.text(facultyName, s1 + 4, finalY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.text("............................................", s2, finalY);
  doc.text("Head of Department (HOD)", s2 + 2, finalY + 4.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Dept. of ${deptName}`, s2 + 2, finalY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.text("............................................", s3, finalY);
  doc.text("Principal / Academic Dean", s3 + 2, finalY + 4.5);
  doc.setFont("helvetica", "bold");
  doc.text("Maharaja Inst. of Technology", s3 + 2, finalY + 8.5);

  // Add Footers
  addFooters(doc);

  // Save the PDF
  const safeName = facultyName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `MITM_Faculty_Appraisal_${safeName}.pdf`;
  doc.save(filename);
};
