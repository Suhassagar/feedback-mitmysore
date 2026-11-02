const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const cacheService = require('../services/cacheService');
const submissionQueue = require('../services/submissionQueue');
const crypto = require('crypto');

//=========================================================
// Generate Idempotency Token
//=========================================================
const generateToken = async (req, res) => {
  try {
    const token = crypto.randomUUID();
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

//=========================================================
// Fetch faculty/subjects for student session
//=========================================================
const getStudentSubjects = async (req, res) => {
  const { session_id } = req.params;
  try {
    const session = await db('global_sessions').where({ session_id }).first();
    if (!session) return res.json([]);

    const { sem, section, dept_id } = session;

    const result = await db('global_assign as a')
      .join('global_course as c', function() {
        this.on('a.course_code', '=', 'c.course_code').andOn('a.dept_id', '=', 'c.dept_id');
      })
      .join('global_faculty as f', function() {
        this.on('a.faculty_id', '=', 'f.faculty_id').andOn('a.dept_id', '=', 'f.dept_id');
      })
      .where({ 'a.sem': sem, 'a.section': section, 'a.dept_id': dept_id })
      .select(
        'c.course_name',
        'c.course_code as course_id',
        'f.faculty_id',
        'f.name as faculty_name',
        'f.profile_picture_url',
        'f.position as designation',
        'a.section',
        'a.sem'
      );

    // Start the timer for this student session
    if (req.session) {
      // Don't overwrite if they just refreshed the page
      if (!req.session.feedback_start_time) {
        req.session.feedback_start_time = Date.now();
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//=========================================================
// Submit Feedback API
//=========================================================
const submitFeedback = async (req, res) => {
  const { role, usn, session_id: student_session_id, dept_id } = req.session || {};
  
  if (role !== 'student' || !usn) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { session_id, facultyList, department_remark, idempotency_key } = req.body;

  if (!session_id || !Array.isArray(facultyList) || !idempotency_key) {
    return res.status(400).json({ error: "Missing required data" });
  }

  // Strict BOLA Defense: Verify client-supplied session_id matches student's authenticated session
  if (student_session_id && String(session_id).trim() !== String(student_session_id).trim()) {
    return res.status(403).json({ error: "Forbidden: Cross-session submission prohibited" });
  }
  
  const effectiveSessionId = student_session_id || session_id;
  const verifiedSessionId = effectiveSessionId;
  const student = { usn, session_id: verifiedSessionId, dept_id };

  const submission_attempt = Number(req.body.submission_attempt || 1);
  const justification_remark = req.body.justification_remark ? String(req.body.justification_remark).trim() : "";

  // 1. IN-MEMORY VALIDATION & AUTHENTICITY ANALYSIS (0 Database operations)
  const allRatings = [];
  for (const faculty of facultyList) {
    if (faculty.feedback) {
      Object.values(faculty.feedback).forEach(rating => {
        if (rating != null) allRatings.push(Number(rating));
      });
    }
  }

  if (allRatings.length === 0) {
    return res.status(400).json({ error: "No feedback ratings provided" });
  }

  // Statistical Variance Check
  let isStraightLined = false;
  const mean = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
  const variance = allRatings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allRatings.length;
  if (variance === 0) {
    isStraightLined = true;
  }

  // Step 1a: On Attempt 1, intercept straight-lining with an educational retry requirement
  if (isStraightLined && submission_attempt === 1) {
    return res.status(422).json({
      success: false,
      code: "INTEGRITY_RETRY_REQUIRED",
      attempt: 1,
      detected_score: allRatings[0],
      message: `Uniform rating of ${allRatings[0]}/5 detected across all faculty questions. Thoughtful, differentiated evaluation is required under institutional quality standards. Please review each teacher's specific delivery and adjust your ratings.`
    });
  }

  // Step 1b: On Attempt 2+, if still uniform, require a minimum 10-char justification
  let integrity_status = 'verified';
  let isGenuine = true;

  if (isStraightLined) {
    if (!justification_remark || justification_remark.length < 10) {
      return res.status(422).json({
        success: false,
        code: "JUSTIFICATION_REQUIRED",
        attempt: submission_attempt,
        detected_score: allRatings[0],
        message: "To confirm uniform ratings across all faculty members, please provide a brief justification (at least 10 characters) explaining why this evaluation applies to all subjects."
      });
    }
    integrity_status = 'justified_exception';
    isGenuine = true;
  }
  
  // Enforce department-configured minimum dwell time (if > 0)
  const sessionRecord = await db('global_sessions').where({ session_id: effectiveSessionId }).first();
  const deptRecord = sessionRecord ? await db('department').where({ dept_id: sessionRecord.dept_id }).first() : null;
  const minTimeSec = deptRecord?.feedback_min_time_sec != null ? Number(deptRecord.feedback_min_time_sec) : 300;

  if (minTimeSec > 0) {
    const minTimeMs = minTimeSec * 1000;
    if (req.session.feedback_start_time) {
      const timeSpent = Date.now() - req.session.feedback_start_time;
      if (timeSpent < minTimeMs) {
        const remainingSecs = Math.ceil((minTimeMs - timeSpent) / 1000);
        return res.status(400).json({ error: `Please take time to read and evaluate. You can submit in ${remainingSecs} seconds.` });
      }
    } else {
      // If somehow start time is missing, set it now and force them to wait
      req.session.feedback_start_time = Date.now();
      return res.status(400).json({ error: `Session timer restarted. Please review the feedback for ${Math.ceil(minTimeSec / 60)} minutes before submitting.` });
    }
  }

  // =========================================================================
  // ENHANCEMENT: Hybrid Asynchronous Ingestion (Peak-Load Protection)
  // =========================================================================

  try {

    // 2. IDEMPOTENCY CHECK: Extremely fast unique index constraint
    try {
      await db('global_used_tokens').insert({ token: idempotency_key });
    } catch (tokenErr) {
      if (tokenErr.code === 'ER_DUP_ENTRY') {
        return res.status(403).json({ error: "Duplicate submission detected. Feedback already submitted." });
      }
      throw tokenErr;
    }

    const dept_id = student.dept_id;

    // 3. MICRO-SYNCHRONOUS LOCK: Update student status instantly without SELECT FOR UPDATE
    const updateResult = await db('global_students')
      .where({ usn: student.usn, dept_id, feedback_given: 'pending' })
      .update({ session_id: verifiedSessionId, feedback_given: 'done' });

    if (updateResult === 0) {
      // Either student not found, or they already submitted
      return res.status(403).json({ error: "Feedback already submitted or student not found" });
    }

    const ratingsToInsert = [];
    const facultyRemarksToInsert = [];
    const sectionRemarksToInsert = [];
    const scorecardUpdatesToInsert = [];

    for (let i = 0; i < facultyList.length; i++) {
      const faculty = facultyList[i];
      if (!faculty.faculty_id || !faculty.course_id) {
        // Rollback sync lock on failure
        await db('global_students').where({ usn: student.usn, dept_id }).update({ session_id: null, feedback_given: 'pending' });
        return res.status(400).json({ error: "Invalid faculty data" });
      }

      const feedback = faculty.feedback || {};
      const questionIds = Object.keys(feedback);
      
      if (questionIds.length === 0) {
        await db('global_students').where({ usn: student.usn, dept_id }).update({ session_id: null, feedback_given: 'pending' });
        return res.status(400).json({ error: "No feedback ratings provided" });
      }

      let sum = 0;
      let rawSum = 0;
      let genuineCount = isGenuine ? 1 : 0;
      let excellent = 0, good = 0, average = 0, poor = 0;

      for (let qId of questionIds) {
        const rating = Number(feedback[qId]);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          await db('global_students').where({ usn: student.usn, dept_id }).update({ session_id: null, feedback_given: 'pending' });
          return res.status(400).json({ error: `Invalid rating for question ${qId}.` });
        }

        ratingsToInsert.push({
          faculty_id: faculty.faculty_id, 
          course_id: faculty.course_id, 
          question_id: qId,
          rating, 
          session_id, 
          dept_id, 
          is_genuine: isGenuine,
          integrity_status,
          submission_attempt,
          justification_remark: justification_remark || null
        });

        rawSum += rating;
        if (isGenuine) {
          sum += rating;
          if (rating >= 4.5) excellent++;
          else if (rating >= 3.5) good++;
          else if (rating >= 2.5) average++;
          else poor++;
        }
      }

      scorecardUpdatesToInsert.push({
        dept_id, 
        faculty_id: faculty.faculty_id, 
        course_id: faculty.course_id, 
        session_id,
        sum, 
        count: questionIds.length, 
        genuineCount, 
        excellent, 
        good, 
        average, 
        poor,
        rawSum,
        rawCount: questionIds.length
      });

      if (faculty.remark && typeof faculty.remark === 'string' && faculty.remark.trim() !== "") {
        facultyRemarksToInsert.push({
          session_id, dept_id, faculty_id: faculty.faculty_id,
          course_id: faculty.course_id, remark_text: faculty.remark.trim()
        });
      }

      if (faculty.section_remarks && typeof faculty.section_remarks === 'object') {
        for (const [section_heading, remark_text] of Object.entries(faculty.section_remarks)) {
          if (remark_text && typeof remark_text === 'string' && remark_text.trim() !== "") {
            sectionRemarksToInsert.push({
              session_id, dept_id, faculty_id: faculty.faculty_id,
              course_id: faculty.course_id, section_heading, remark_text: remark_text.trim()
            });
          }
        }
      }
    }

    // 4. INSTANT RESPONSE: Unblock the student's UI completely. 
    // Secure terminal cleanup: Immediately destroy student session and clear session cookie
    if (req.session) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) console.error("Session destroy error on feedback submit:", destroyErr);
        res.clearCookie('connect.sid');
        res.json({ message: "Feedback submitted successfully" });
      });
    } else {
      res.clearCookie('connect.sid');
      res.json({ message: "Feedback submitted successfully" });
    }

    // 5. ASYNCHRONOUS MICRO-BATCH QUEUE WORKER
    submissionQueue.enqueue({
      dept_id,
      session_id: verifiedSessionId,
      ratingsToInsert,
      facultyRemarksToInsert,
      sectionRemarksToInsert,
      scorecardUpdatesToInsert,
      department_remark,
      io: req.app?.get('io')
    });

    await logActivity(req, dept_id, 'SUBMIT', 'FEEDBACK', `Anonymous feedback submitted for session ${verifiedSessionId} (${ratingsToInsert.length} ratings queued, integrity: ${integrity_status})`, 'SUCCESS');

  } catch (err) {
    console.error("Error staging feedback:", err);
    res.status(500).json({ error: "Server error" });
  }
};

//=========================================================
// Dynamic Feedback Questions APIs
//=========================================================
const getQuestions = async (req, res) => {
  let { dept_id } = req.params;
  if (dept_id) dept_id = dept_id.toUpperCase();
  const cacheKey = `questions:dept:${dept_id || 'ALL'}`;

  // 1. Check in-memory cache
  const cached = cacheService.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache-Status', 'HIT');
    return res.json(cached);
  }

  try {
    const rows = await db('global_feedback_questions')
      .whereRaw('UPPER(dept_id) = ?', [dept_id])
      .orderBy(['question_heading', 'question_id']);
    
    // Store in RAM for 15 minutes (900 seconds)
    cacheService.set(cacheKey, rows, 900);
    res.setHeader('X-Cache-Status', 'MISS');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

const getStudentQuestions = async (req, res) => {
  const { session_id } = req.params;
  const cacheKey = `questions:session:${session_id}`;

  // 1. Check in-memory cache
  const cached = cacheService.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache-Status', 'HIT');
    return res.json(cached);
  }

  try {
    const session = await db('global_sessions').where({ session_id }).first();
    if (!session) return res.status(404).json({ error: "Session not found" });

    const rows = await db('global_feedback_questions')
      .whereRaw('UPPER(dept_id) = ?', [session.dept_id.toUpperCase()])
      .orderBy(['question_heading', 'question_id']);

    // Store in RAM for 10 minutes (600 seconds)
    cacheService.set(cacheKey, rows, 600);
    res.setHeader('X-Cache-Status', 'MISS');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching student questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

const addQuestion = async (req, res) => {
  const { question_text, question_heading = "General Feedback" } = req.body;
  let dept_id = req.body.dept_id || req.session.dept_id || req.query.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  if (!question_text) return res.status(400).json({ error: "Question text required" });
  if (!dept_id) return res.status(400).json({ error: "Department ID required" });

  try {
    const [id] = await db('global_feedback_questions').insert({
      question_text, question_heading, dept_id
    });
    // Invalidate questions cache across all departments & active sessions
    cacheService.delPattern('questions:*');
    res.json({ message: "Question added successfully", question_id: id });
  } catch (err) {
    console.error("Error adding question:", err);
    res.status(500).json({ error: "Failed to add question" });
  }
};

const bulkUploadQuestions = async (req, res) => {
  const { questions } = req.body;
  let dept_id = req.body.dept_id || req.session.dept_id || req.query.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  if (!dept_id) return res.status(400).json({ error: "Department ID required" });

  if (req.session?.role === 'department' && req.session.dept_id && dept_id !== req.session.dept_id.toUpperCase()) {
    return res.status(403).json({ error: "Unauthorized: Cannot bulk upload questions for another department." });
  }

  if (questions.length > 500) {
    return res.status(400).json({ error: "Batch size exceeds maximum limit of 500 records per upload." });
  }

  try {
    let insertedCount = 0;
    for (const q of questions) {
      const text = typeof q === "string" ? q : (q.question_text || q.question || q.text);
      const heading = typeof q === "string" ? "General Feedback" : (q.question_heading || q.heading || "General Feedback");
      if (text && String(text).trim()) {
        await db('global_feedback_questions').insert({ 
          question_text: String(text).trim(), 
          question_heading: String(heading).trim(), 
          dept_id 
        });
        insertedCount++;
      }
    }
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'UPLOAD', 'QUESTION', `Bulk uploaded ${insertedCount} feedback questions`);
    }

    // Invalidate questions cache across all departments & active sessions
    cacheService.delPattern('questions:*');

    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    console.error("Bulk Question Upload Error:", err);
    res.status(500).json({ error: "Failed to upload questions", details: err.message });
  }
};

const updateQuestion = async (req, res) => {
  const { id } = req.params;
  const { question_text } = req.body;
  let dept_id = req.body?.dept_id || req.session.dept_id || req.query.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  if (!question_text) return res.status(400).json({ error: "Question text is required" });

  try {
    const q = db('global_feedback_questions').where({ question_id: id });
    if (dept_id) q.andWhere({ dept_id });
    await q.update({ question_text });
    // Invalidate questions cache across all departments & active sessions
    cacheService.delPattern('questions:*');
    res.json({ message: "Question updated successfully" });
  } catch (err) {
    console.error("Error updating question:", err);
    res.status(500).json({ error: "Failed to update question" });
  }
};

const deleteQuestion = async (req, res) => {
  const { id } = req.params;
  let dept_id = req.body?.dept_id || req.session.dept_id || req.query.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const feedbackQuery = db('global_student_feedback').where({ question_id: id });
    const questionQuery = db('global_feedback_questions').where({ question_id: id });
    if (dept_id) {
      feedbackQuery.andWhere({ dept_id });
      questionQuery.andWhere({ dept_id });
    }
    await feedbackQuery.del();
    await questionQuery.del();
    // Invalidate questions cache across all departments & active sessions
    cacheService.delPattern('questions:*');
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleting question:", err);
    res.status(500).json({ error: "Failed to delete question" });
  }
};

// Also adding feedback averages since they are directly related to feedback
const getSubjectsWithAvg = async (req, res) => {
  const { faculty_id } = req.params;
  const dept_id = req.session.dept_id || req.query.dept_id;

  try {
    let q = db('global_student_feedback')
      .where({ faculty_id, is_genuine: true });
    if (dept_id) {
      q = q.andWhere({ dept_id });
    }
    const rows = await q
      .select('course_id')
      .select(db.raw('ROUND(COALESCE(AVG(rating), 0), 2) as avg_rating'))
      .groupBy('course_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getQuestionsAvg = async (req, res) => {
  const { faculty_id, course_id } = req.params;
  const dept_id = req.session.dept_id || req.query.dept_id;
  try {
    let q = db('global_student_feedback as f')
      .join('global_feedback_questions as q', function() {
        this.on('f.question_id', '=', 'q.question_id').andOn('f.dept_id', '=', 'q.dept_id');
      })
      .where({ 'f.faculty_id': faculty_id, 'f.course_id': course_id, 'f.is_genuine': true });

    if (dept_id) {
      q = q.andWhere({ 'f.dept_id': dept_id });
    }

    const rows = await q
      .select('f.question_id', 'q.question_text', 'q.question_heading', db.raw('ROUND(COALESCE(AVG(f.rating), 0), 2) as avg_rating'))
      .groupBy('f.question_id', 'q.question_text', 'q.question_heading')
      .orderBy('f.question_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getFeedbackTiming = async (req, res) => {
  const { session_id } = req.params;
  try {
    const session = await db('global_sessions').where({ session_id }).first();
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const dept = await db('department').where({ dept_id: session.dept_id }).first();
    const min_time_sec = dept?.feedback_min_time_sec != null ? Number(dept.feedback_min_time_sec) : 300;
    res.json({
      session_id,
      dept_id: session.dept_id,
      min_time_sec,
      is_timer_enabled: min_time_sec > 0
    });
  } catch (err) {
    console.error("Error fetching feedback timing:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  generateToken,
  getStudentSubjects,
  submitFeedback,
  getQuestions,
  getStudentQuestions,
  addQuestion,
  bulkUploadQuestions,
  updateQuestion,
  deleteQuestion,
  getSubjectsWithAvg,
  getQuestionsAvg,
  getFeedbackTiming
};
