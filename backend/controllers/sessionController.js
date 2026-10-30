const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const { sendFeedbackEmail } = require('../utils/emailService');

//=========================================================
// Create session
//=========================================================
const createSession = async (req, res) => {
  let { session_id, dept_id, sem, section } = req.body;
  if (!session_id || !dept_id || !sem || !section) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Multi-tenant authorization guard: Department users can only create sessions for their own department
  if (req.session && req.session.role === 'department') {
    const sessionDept = String(req.session.dept_id || '').trim().toUpperCase();
    const reqDept = String(dept_id).trim().toUpperCase();
    if (sessionDept && reqDept !== sessionDept) {
      return res.status(403).json({ error: "Forbidden: You cannot create sessions for another department." });
    }
    dept_id = sessionDept;
  }

  dept_id = String(dept_id).trim().toUpperCase();
  sem = parseInt(sem, 10);
  section = String(section).trim().toUpperCase();
  session_id = String(session_id).trim();

  const trx = await db.transaction();
  try {
    // GATE 1: Student Check (case/type-safe)
    const students = await trx('global_students')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [dept_id, sem, section])
      .count('* as count')
      .first();
      
    if (!students || students.count === 0) {
      await trx.rollback();
      return res.status(400).json({ error: `Cannot create session: No students are currently registered in Sem ${sem} Section ${section}.` });
    }

    // GATE 2: Faculty/Course Assignment Check
    const assignments = await trx('global_assign')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [dept_id, sem, section])
      .count('* as count')
      .first();

    if (!assignments || assignments.count === 0) {
      await trx.rollback();
      return res.status(400).json({ error: `Cannot create session: No faculty have been assigned to teach Sem ${sem} Section ${section} yet.` });
    }

    // Check if an active session already exists
    const existing = await trx('global_sessions')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ? AND status = ?', [dept_id, sem, section, 'active'])
      .forUpdate()
      .first();

    if (existing) {
      await trx.rollback();
      return res.status(400).json({ error: "An active session for this semester and section already exists!" });
    }

    await trx('global_sessions').insert({
      session_id, sem, section, dept_id, status: "active"
    });
    
    // ACTIVE TRACKING: Bind all eligible students to this new session immediately
    await trx('global_students')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [dept_id, sem, section])
      .update({ session_id, feedback_given: 'missing' });
    
    // Write to Audit Log
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'CREATE', 'SESSION', `Created feedback session ${session_id} for Sem ${sem} Sec ${section}`);
    }

    await trx.commit();
    res.json({ message: "Session created" });
  } catch (err) {
    await trx.rollback();
    console.error("Error creating session:", err);
    res.status(500).json({ error: "Error creating session" });
  }
};

//=========================================================
// Get sessions
//=========================================================
const getSessions = async (req, res) => {
  try {
    const dept_id = req.session.dept_id || req.query.dept || req.query.dept_id;
    
    const query = db('global_sessions as s');
    if (dept_id) {
      query.where({ 's.dept_id': dept_id });
    }
    
    const sessions = await query
      .select(
        's.session_id', 's.sem', 's.section', 's.status', 's.dept_id',
        db.raw("DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS created_at"),
        db.raw(`(
          SELECT COUNT(*) FROM global_students st 
          WHERE UPPER(st.dept_id) = UPPER(s.dept_id) 
            AND st.sem = s.sem 
            AND UPPER(TRIM(st.section)) = UPPER(TRIM(s.section))
        ) as total_students`),
        db.raw(`(
          SELECT COALESCE(
            NULLIF((SELECT COUNT(*) FROM global_students st WHERE st.session_id = s.session_id AND st.feedback_given = 'done'), 0),
            (SELECT COALESCE(MAX(ROUND(sc.ratings_count / NULLIF((SELECT COUNT(*) FROM global_feedback_questions q WHERE UPPER(q.dept_id) = UPPER(s.dept_id)), 0))), 0)
             FROM global_faculty_scorecards sc WHERE sc.session_id = s.session_id AND UPPER(sc.dept_id) = UPPER(s.dept_id)),
            0
          )
        ) as completed_students`)
      )
      .orderBy('s.status', 'desc')
      .orderBy('s.created_at', 'desc');

    const enriched = sessions.map(s => {
      const total = parseInt(s.total_students, 10) || 0;
      const completed = parseInt(s.completed_students, 10) || 0;
      const turnout_pct = total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0;
      return {
        ...s,
        total_students: total,
        completed_students: completed,
        turnout_pct
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error("Error loading sessions:", err);
    res.status(500).json({ message: "DB error", error: err.message });
  }
};

//=========================================================
// End session
//=========================================================
const endSession = async (req, res) => {
  const session_id = req.params.id;
  const dept_id = req.session.dept_id || req.query.dept_id || req.query.dept || req.body?.dept_id;

  try {
    const query = db('global_sessions').where({ session_id });
    if (dept_id) query.andWhere({ dept_id });

    const updatedCount = await query.update({ status: 'ended' });

    if (updatedCount === 0)
      return res.status(404).json({ message: "Session not found" });
      
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id || 'DEPT', 'UPDATE', 'SESSION', `Ended feedback session ${session_id}`);
    }

    res.json({ message: "Session ended successfully" });
  } catch (err) {
    console.error("Error ending session:", err);
    res.status(500).json({ message: "Error ending session" });
  }
};

//=========================================================
// Delete session
//=========================================================
const deleteSession = async (req, res) => {
  const session_id = req.params.id;
  const dept_id = req.session.dept_id || req.query.dept_id || req.query.dept || req.body?.dept_id;

  const trx = await db.transaction();
  try {
    const sessionQuery = trx('global_sessions').where({ session_id });
    if (dept_id) sessionQuery.andWhere({ dept_id });
    const rows = await sessionQuery.forUpdate();

    if (rows.length === 0) {
      await trx.rollback();
      return res.status(404).json({ message: "Session not found" });
    }

    const actualDeptId = rows[0].dept_id;

    // Clean up orphaned records to maintain data integrity
    await trx('global_student_feedback').where({ session_id, dept_id: actualDeptId }).del();
    await trx('global_session_remarks').where({ session_id, dept_id: actualDeptId }).del();
    await trx('global_faculty_remarks').where({ session_id, dept_id: actualDeptId }).del().catch(() => {});
    await trx('global_students').where({ session_id, dept_id: actualDeptId }).update({ session_id: null, feedback_given: 'missing' });
    await trx('global_sessions').where({ session_id, dept_id: actualDeptId }).del();
    
    if (req.session?.role === 'department') {
      await logActivity(req, actualDeptId, 'DELETE', 'SESSION', `Deleted feedback session ${session_id}`);
    }

    await trx.commit();
    res.json({ message: "Session deleted successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("Error deleting session:", err);
    res.status(500).json({ message: "Error deleting session" });
  }
};

//=========================================================
// Track session participation
//=========================================================
const trackSession = async (req, res) => {
  const { session_id } = req.params;
  const dept_id = req.session.dept_id || req.query.dept_id || req.query.dept;
  
  try {
    const sessionQuery = db('global_sessions').where({ session_id });
    if (dept_id) sessionQuery.andWhere({ dept_id });
    const session = await sessionQuery.first();
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Auto-heal: If session is active, bind any students in this sem/section who are missing session_id
    if (session.status === 'active') {
      await db('global_students')
        .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ? AND (session_id IS NULL OR session_id != ?)', [session.dept_id, session.sem, session.section, session.session_id])
        .update({ session_id: session.session_id, feedback_given: 'missing' });
    }

    const trackRows = await db('global_students')
      .where({ session_id, dept_id: session.dept_id })
      .whereRaw('sem = ? AND UPPER(TRIM(section)) = ?', [session.sem, session.section])
      .select('usn', 'name', 'sem', 'section', db.raw("COALESCE(feedback_given, 'missing') as status"))
      .orderBy('usn', 'asc');
    
    res.json(trackRows);
  } catch (err) {
    console.error("Track Error:", err);
    res.status(500).json({ error: "Error tracking session" });
  }
};

//=========================================================
// Notify Students
//=========================================================
const notifyStudents = async (req, res) => {
  const { session_id } = req.params;

  try {
    const session = await db('global_sessions').where({ session_id }).first();
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found." });
    }

    const dept_id = (req.session?.dept_id || req.body?.dept_id || session.dept_id || '').toUpperCase();

    // Auto-heal: Ensure all students in this sem/section are bound to the active session
    if (session.status === 'active') {
      await db('global_students')
        .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [
          session.dept_id.toUpperCase(), 
          session.sem, 
          session.section.toUpperCase()
        ])
        .update({ session_id: session.session_id, feedback_given: 'missing' });
    }

    // Robust Student Query: First match by department (case-insensitive), semester, and section
    let students = await db('global_students')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [
        session.dept_id.toUpperCase(), 
        session.sem, 
        session.section.toUpperCase()
      ])
      .whereNotNull('email')
      .andWhere('email', '!=', '');

    // Fallback: If no students matched by sem/sec, match by session_id
    if (students.length === 0) {
      students = await db('global_students')
        .where({ session_id })
        .whereNotNull('email')
        .andWhere('email', '!=', '');
    }

    if (students.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: `No registered students with email addresses found for Sem ${session.sem} Sec ${session.section} in department ${session.dept_id}. Please add student emails in Student Roster.` 
      });
    }

    let successCount = 0;
    let failCount = 0;
    let lastError = null;

    // Send emails in controlled batches of 5 with connection reuse
    const BATCH_SIZE = 5;
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(student =>
          sendFeedbackEmail(student.email, student.name, student.usn, session_id)
            .then(() => successCount++)
            .catch((err) => {
              lastError = err.message || String(err);
              console.error(`Failed to send email to ${student.email}:`, err.message);
              failCount++;
            })
        )
      );
      if (i + BATCH_SIZE < students.length) {
        await new Promise(r => setTimeout(r, 200)); // Breather between batches
      }
    }

    if (successCount === 0 && failCount > 0) {
      return res.status(500).json({
        success: false,
        error: `Failed to deliver emails to ${failCount} student(s). Reason: ${lastError || "SMTP connection/authentication failed"}. Please check EMAIL_USER and EMAIL_PASS in Render environment settings.`
      });
    }

    res.json({ 
      success: true, 
      message: `Emails sent successfully to ${successCount} student(s).${failCount > 0 ? ` Note: Failed for ${failCount} student(s): ${lastError}` : ''}` 
    });
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ success: false, error: err.message || "An error occurred while sending emails. Check server logs." });
  }
};

//=========================================================
// Get Session Consolidated Report Data
//=========================================================
const getSessionReportData = async (req, res) => {
  const { session_id } = req.params;
  const userRole = req.session?.role;
  const userDept = req.session?.dept_id;

  try {
    const session = await db('global_sessions as s')
      .join('department as d', 's.dept_id', 'd.dept_id')
      .where({ 's.session_id': session_id })
      .select('s.session_id', 's.sem', 's.section', 's.status', 's.dept_id', 'd.dept_name', 's.created_at')
      .first();

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Role check: Department HODs can only access their own department's sessions
    if (userRole === 'department' && userDept && userDept.toUpperCase() !== session.dept_id.toUpperCase()) {
      return res.status(403).json({ error: "Forbidden: You cannot access session reports from another department." });
    }

    // 1. Total eligible students
    const totalStudentsRow = await db('global_students')
      .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ?', [
        session.dept_id.toUpperCase(),
        session.sem,
        session.section.toUpperCase()
      ])
      .count('* as total')
      .first();
    const totalStudents = parseInt(totalStudentsRow?.total, 10) || 0;

    // 2. Completed students
    let completedStudentsRow = await db('global_students')
      .where({ session_id, feedback_given: 'done' })
      .count('* as completed')
      .first();
    let completedStudents = parseInt(completedStudentsRow?.completed, 10) || 0;

    // Fallback if session ended and students were reassigned
    if (completedStudents === 0) {
      const qCountRow = await db('global_feedback_questions').whereRaw('UPPER(dept_id) = ?', [session.dept_id.toUpperCase()]).count('* as c').first();
      const qCount = parseInt(qCountRow?.c, 10) || 1;
      const scoreRow = await db('global_faculty_scorecards')
        .whereRaw('session_id = ? AND UPPER(dept_id) = ?', [session_id, session.dept_id.toUpperCase()])
        .max('ratings_count as max_ratings')
        .first();
      if (scoreRow?.max_ratings) {
        completedStudents = Math.round(scoreRow.max_ratings / qCount);
      }
    }

    const turnoutPct = totalStudents > 0 ? parseFloat(((completedStudents / totalStudents) * 100).toFixed(1)) : 0;
    const pendingStudents = Math.max(0, totalStudents - completedStudents);

    // 3. Overall Session Average Rating
    const overallAvgRow = await db('global_student_feedback')
      .where({ session_id, is_genuine: true })
      .avg('rating as avg_rating')
      .first();
    const sessionOverallRating = overallAvgRow?.avg_rating ? parseFloat(overallAvgRow.avg_rating).toFixed(2) : "0.00";

    // 4. Faculties teaching in this session (assigned to this sem & sec in this dept)
    const assignedFaculties = await db('global_assign as a')
      .join('global_faculty as f', function() {
        this.on('a.faculty_id', '=', 'f.faculty_id').andOn('a.dept_id', '=', 'f.dept_id');
      })
      .join('global_course as c', function() {
        this.on('a.course_code', '=', 'c.course_code').andOn('a.dept_id', '=', 'c.dept_id');
      })
      .leftJoin('global_faculty_scorecards as sc', function() {
        this.on('sc.session_id', '=', db.raw('?', [session_id]))
          .andOn('sc.faculty_id', '=', 'f.faculty_id')
          .andOn('sc.course_id', '=', 'c.course_code')
          .andOn('sc.dept_id', '=', 'a.dept_id');
      })
      .whereRaw('UPPER(a.dept_id) = ? AND a.sem = ? AND UPPER(TRIM(a.section)) = ?', [
        session.dept_id.toUpperCase(),
        session.sem,
        session.section.toUpperCase()
      ])
      .select(
        'f.faculty_id', 'f.name', 'f.position as designation', 'f.email', 'f.profile_picture_url',
        'c.course_code', 'c.course_name',
        'sc.total_score_sum', 'sc.ratings_count', 'sc.genuine_count',
        'sc.excellent_count', 'sc.good_count', 'sc.average_count', 'sc.poor_count'
      )
      .orderBy('f.name', 'asc');

    // Also check for any faculty with scorecards recorded for this session_id who might not be in assign table currently
    const scorecardFaculties = await db('global_faculty_scorecards as sc')
      .join('global_faculty as f', function() {
        this.on('sc.faculty_id', '=', 'f.faculty_id').andOn('sc.dept_id', '=', 'f.dept_id');
      })
      .join('global_course as c', function() {
        this.on('sc.course_id', '=', 'c.course_code').andOn('sc.dept_id', '=', 'c.dept_id');
      })
      .where({ 'sc.session_id': session_id })
      .select(
        'f.faculty_id', 'f.name', 'f.position as designation', 'f.email', 'f.profile_picture_url',
        'c.course_code', 'c.course_name',
        'sc.total_score_sum', 'sc.ratings_count', 'sc.genuine_count',
        'sc.excellent_count', 'sc.good_count', 'sc.average_count', 'sc.poor_count'
      );

    // Merge faculties without duplication
    const facultyMap = new Map();
    for (const f of [...assignedFaculties, ...scorecardFaculties]) {
      const key = `${f.faculty_id}_${f.course_code}`;
      if (!facultyMap.has(key)) {
        facultyMap.set(key, f);
      }
    }

    // 4b. Direct feedback stats from global_student_feedback
    const feedbackStats = await db('global_student_feedback as sf')
      .where({ 'sf.session_id': session_id, 'sf.is_genuine': 1 })
      .select(
        'sf.faculty_id',
        'sf.course_id',
        db.raw('ROUND(AVG(sf.rating), 2) as avg_rating'),
        db.raw('COUNT(sf.rating) as ratings_count'),
        db.raw('SUM(CASE WHEN sf.rating >= 4.5 THEN 1 ELSE 0 END) as excellent_count'),
        db.raw('SUM(CASE WHEN sf.rating >= 3.5 AND sf.rating < 4.5 THEN 1 ELSE 0 END) as good_count'),
        db.raw('SUM(CASE WHEN sf.rating >= 2.5 AND sf.rating < 3.5 THEN 1 ELSE 0 END) as average_count'),
        db.raw('SUM(CASE WHEN sf.rating < 2.5 THEN 1 ELSE 0 END) as poor_count')
      )
      .groupBy('sf.faculty_id', 'sf.course_id');

    const feedbackStatsMap = new Map();
    for (const stat of feedbackStats) {
      feedbackStatsMap.set(`${stat.faculty_id}_${stat.course_id}`, stat);
    }

    const questionCountRow = await db('global_feedback_questions').whereRaw('UPPER(dept_id) = ?', [session.dept_id.toUpperCase()]).count('* as c').first();
    const qCount = parseInt(questionCountRow?.c, 10) || 15;

    const facultiesList = Array.from(facultyMap.values()).map(f => {
      const directStat = feedbackStatsMap.get(`${f.faculty_id}_${f.course_code}`);

      let avgRating = "0.00";
      let ratingsCount = 0;
      let excellentCount = 0;
      let goodCount = 0;
      let averageCount = 0;
      let poorCount = 0;

      if (directStat && directStat.ratings_count > 0) {
        avgRating = parseFloat(directStat.avg_rating).toFixed(2);
        ratingsCount = parseInt(directStat.ratings_count, 10);
        excellentCount = parseInt(directStat.excellent_count, 10) || 0;
        goodCount = parseInt(directStat.good_count, 10) || 0;
        averageCount = parseInt(directStat.average_count, 10) || 0;
        poorCount = parseInt(directStat.poor_count, 10) || 0;
      } else if (f.ratings_count > 0) {
        // Fallback to scorecards: divide total sum by total ratings count (1-5 point scale)
        avgRating = (parseFloat(f.total_score_sum) / parseInt(f.ratings_count, 10)).toFixed(2);
        ratingsCount = parseInt(f.ratings_count, 10);
        excellentCount = parseInt(f.excellent_count, 10) || 0;
        goodCount = parseInt(f.good_count, 10) || 0;
        averageCount = parseInt(f.average_count, 10) || 0;
        poorCount = parseInt(f.poor_count, 10) || 0;
      }

      const num = parseFloat(avgRating);
      let performanceCategory = "N/A";
      if (ratingsCount > 0 && num > 0) {
        if (num >= 4.5) performanceCategory = "Exemplary (A+)";
        else if (num >= 4.0) performanceCategory = "Very Good (A)";
        else if (num >= 3.5) performanceCategory = "Good (B+)";
        else if (num >= 3.0) performanceCategory = "Satisfactory (B)";
        else performanceCategory = "Needs Improvement (C)";
      }

      const studentSubmissions = f.genuine_count && parseInt(f.genuine_count, 10) > 0
        ? parseInt(f.genuine_count, 10)
        : (ratingsCount > 0 ? Math.max(1, Math.round(ratingsCount / qCount)) : 0);

      return {
        faculty_id: f.faculty_id,
        name: f.name || "Unknown Faculty",
        designation: f.designation || "Faculty",
        email: f.email || "—",
        course_code: f.course_code,
        course_name: f.course_name,
        avg_rating: avgRating,
        performance_category: performanceCategory,
        feedbacks_count: studentSubmissions,
        distribution: {
          excellent: excellentCount,
          good: goodCount,
          average: averageCount,
          poor: poorCount
        }
      };
    });

    const getCategoryForRating = (rating) => {
      const num = parseFloat(rating);
      if (isNaN(num) || num <= 0) return "N/A";
      if (num >= 4.5) return "Exemplary (A+)";
      if (num >= 4.0) return "Very Good (A)";
      if (num >= 3.5) return "Good (B+)";
      if (num >= 3.0) return "Satisfactory (B)";
      return "Needs Improvement (C)";
    };

    // 5. Fetch all questions for this department with their headings
    let allQuestions = await db('global_feedback_questions')
      .whereRaw('UPPER(dept_id) = ?', [session.dept_id.toUpperCase()])
      .select('question_id', 'question_heading', 'question_text')
      .orderBy('question_id', 'asc');

    if (!allQuestions || allQuestions.length === 0) {
      allQuestions = await db('global_feedback_questions')
        .select('question_id', 'question_heading', 'question_text')
        .orderBy('question_id', 'asc');
    }

    // Fetch granular ratings grouped by faculty, course, and question for this session
    const facultyQuestionRatings = await db('global_student_feedback as sf')
      .where({ 'sf.session_id': session_id, 'sf.is_genuine': 1 })
      .select(
        'sf.faculty_id',
        'sf.course_id',
        'sf.question_id',
        db.raw('ROUND(AVG(sf.rating), 2) as avg_rating'),
        db.raw('COUNT(sf.rating) as count')
      )
      .groupBy('sf.faculty_id', 'sf.course_id', 'sf.question_id');

    const fqMap = new Map();
    for (const r of facultyQuestionRatings) {
      fqMap.set(`${r.faculty_id}_${r.course_id}_${r.question_id}`, r);
    }

    const facultiesWithBreakdown = facultiesList.map(f => {
      const fKey = `${f.faculty_id}_${f.course_code}`;
      const fRatingNum = parseFloat(f.avg_rating || 0);

      // Granular questions for this specific faculty and subject
      const fQuestions = allQuestions.map((q, qIdx) => {
        const stat = fqMap.get(`${fKey}_${q.question_id}`);
        const avg = stat ? parseFloat(stat.avg_rating).toFixed(2) : "0.00";
        const avgNum = parseFloat(avg);
        return {
          question_id: q.question_id,
          question_number: qIdx + 1,
          question_heading: q.question_heading || "General Feedback",
          question_text: q.question_text,
          avg_rating: avg,
          score_percentage: ((avgNum / 5) * 100).toFixed(1),
          count: stat ? parseInt(stat.count, 10) : 0,
          performance_category: getCategoryForRating(avg)
        };
      });

      // Section-by-section breakdown (grouped by question_heading)
      const sectionMap = new Map();
      for (const q of fQuestions) {
        const heading = q.question_heading;
        if (!sectionMap.has(heading)) {
          sectionMap.set(heading, { heading, totalScore: 0, count: 0, totalQuestions: 0 });
        }
        const s = sectionMap.get(heading);
        s.totalQuestions += 1;
        const score = parseFloat(q.avg_rating);
        if (score > 0) {
          s.totalScore += score;
          s.count += 1;
        }
      }

      const fSections = Array.from(sectionMap.values()).map(s => {
        const avg = s.count > 0 ? (s.totalScore / s.count).toFixed(2) : "0.00";
        const avgNum = parseFloat(avg);
        return {
          heading: s.heading,
          avg_rating: avg,
          score_percentage: ((avgNum / 5) * 100).toFixed(1),
          questions_count: s.totalQuestions,
          performance_category: getCategoryForRating(avg)
        };
      });

      return {
        ...f,
        score_percentage: ((fRatingNum / 5) * 100).toFixed(1),
        sections: fSections,
        questions: fQuestions
      };
    });

    // 6. Global Question-by-question breakdown for the session
    let questions = await db('global_feedback_questions as q')
      .leftJoin('global_student_feedback as sf', function() {
        this.on('sf.question_id', '=', 'q.question_id')
          .andOn('sf.dept_id', '=', 'q.dept_id')
          .andOn('sf.session_id', '=', db.raw('?', [session_id]))
          .andOn('sf.is_genuine', '=', db.raw('1'));
      })
      .whereRaw('UPPER(q.dept_id) = ?', [session.dept_id.toUpperCase()])
      .select(
        'q.question_id',
        'q.question_heading',
        'q.question_text',
        db.raw('ROUND(COALESCE(AVG(sf.rating), 0), 2) as avg_rating'),
        db.raw('COUNT(sf.rating) as count')
      )
      .groupBy('q.question_id', 'q.question_heading', 'q.question_text')
      .orderBy('q.question_id', 'asc');

    if (!questions || questions.length === 0) {
      questions = await db('global_feedback_questions as q')
        .leftJoin('global_student_feedback as sf', function() {
          this.on('sf.question_id', '=', 'q.question_id')
            .andOn('sf.session_id', '=', db.raw('?', [session_id]))
            .andOn('sf.is_genuine', '=', db.raw('1'));
        })
        .select(
          'q.question_id',
          'q.question_heading',
          'q.question_text',
          db.raw('ROUND(COALESCE(AVG(sf.rating), 0), 2) as avg_rating'),
          db.raw('COUNT(sf.rating) as count')
        )
        .groupBy('q.question_id', 'q.question_heading', 'q.question_text')
        .orderBy('q.question_id', 'asc');
    }

    // Build Master Comparative Matrix
    const sessionQAvgMap = new Map();
    for (const q of questions) {
      sessionQAvgMap.set(q.question_id, parseFloat(q.avg_rating || 0).toFixed(2));
    }

    const comparativeMatrix = allQuestions.map((q, idx) => {
      const facultyScores = facultiesWithBreakdown.map(f => {
        const stat = fqMap.get(`${f.faculty_id}_${f.course_code}_${q.question_id}`);
        const score = stat ? parseFloat(stat.avg_rating).toFixed(2) : "0.00";
        const scoreNum = parseFloat(score);
        return {
          faculty_id: f.faculty_id,
          faculty_name: f.name,
          designation: f.designation,
          course_code: f.course_code,
          course_name: f.course_name,
          avg_rating: score,
          score_percentage: ((scoreNum / 5) * 100).toFixed(1),
          performance_category: getCategoryForRating(score)
        };
      });

      const sessionAvg = sessionQAvgMap.get(q.question_id) || "0.00";
      return {
        question_id: q.question_id,
        question_number: idx + 1,
        question_heading: q.question_heading,
        question_text: q.question_text,
        faculty_scores: facultyScores,
        session_avg: sessionAvg,
        session_percentage: ((parseFloat(sessionAvg) / 5) * 100).toFixed(1)
      };
    });

    // Current academic year calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const academicYear = now.getMonth() >= 6 ? `${currentYear}–${currentYear + 1}` : `${currentYear - 1}–${currentYear}`;

    res.json({
      session: {
        session_id: session.session_id,
        dept_id: session.dept_id,
        dept_name: session.dept_name,
        sem: session.sem,
        section: session.section,
        status: session.status,
        created_at: session.created_at,
        academic_year: academicYear
      },
      turnout: {
        total_students: totalStudents,
        completed_students: completedStudents,
        turnout_percentage: turnoutPct,
        pending_students: pendingStudents
      },
      sessionOverallRating,
      faculties: facultiesWithBreakdown,
      questionBreakdown: questions,
      comparativeMatrix
    });

  } catch (err) {
    console.error("Error fetching session report data:", err);
    res.status(500).json({ error: "Error fetching session report data" });
  }
};

module.exports = {
  createSession,
  getSessions,
  endSession,
  deleteSession,
  trackSession,
  notifyStudents,
  getSessionReportData
};
