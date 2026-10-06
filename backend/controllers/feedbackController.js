const db = require('../config/db');
const { logActivity } = require('../utils/logger');
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
  
  const student = { usn, session_id: student_session_id, dept_id };
  
  // Enforce department-configured minimum dwell time (if > 0)
  const sessionRecord = await db('global_sessions').where({ session_id }).first();
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
    // 1. IDEMPOTENCY CHECK: Extremely fast unique index constraint
    try {
      await db('global_used_tokens').insert({ token: idempotency_key });
    } catch (tokenErr) {
      if (tokenErr.code === 'ER_DUP_ENTRY') {
        return res.status(403).json({ error: "Duplicate submission detected. Feedback already submitted." });
      }
      throw tokenErr;
    }

    const dept_id = student.dept_id;

    // 2. MICRO-SYNCHRONOUS LOCK: Update student status instantly without SELECT FOR UPDATE
    const updateResult = await db('global_students')
      .where({ usn: student.usn, dept_id, feedback_given: 'pending' })
      .update({ session_id, feedback_given: 'done' });

    if (updateResult === 0) {
      // Either student not found, or they already submitted
      return res.status(403).json({ error: "Feedback already submitted or student not found" });
    }

    // 3. IN-MEMORY VALIDATION & STAGING (0 Database operations)
    const allRatings = [];
    for (const faculty of facultyList) {
      if (faculty.feedback) {
        Object.values(faculty.feedback).forEach(rating => {
          if (rating != null) allRatings.push(Number(rating));
        });
      }
    }
    
    let isGenuine = true;
    if (allRatings.length > 0) {
      const mean = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      const variance = allRatings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allRatings.length;
      if (variance === 0) {
        isGenuine = false; // Flag as straight-lined (shadowban)
      }
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
      let genuineCount = isGenuine ? 1 : 0;
      let excellent = 0, good = 0, average = 0, poor = 0;

      for (let qId of questionIds) {
        const rating = Number(feedback[qId]);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          await db('global_students').where({ usn: student.usn, dept_id }).update({ session_id: null, feedback_given: 'pending' });
          return res.status(400).json({ error: `Invalid rating for question ${qId}.` });
        }

        ratingsToInsert.push({
          faculty_id: faculty.faculty_id, course_id: faculty.course_id, question_id: qId,
          rating, session_id, dept_id, is_genuine: isGenuine
        });

        if (isGenuine) {
          sum += rating;
          if (rating >= 4.5) excellent++;
          else if (rating >= 3.5) good++;
          else if (rating >= 2.5) average++;
          else poor++;
        }
      }

      scorecardUpdatesToInsert.push({
        dept_id, faculty_id: faculty.faculty_id, course_id: faculty.course_id, session_id,
        sum, count: questionIds.length, genuineCount, excellent, good, average, poor
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
    // They are fully logged out and recorded as 'done'.
    res.json({ message: "Feedback submitted successfully" });

    // 5. ASYNCHRONOUS HEAVY INGESTION QUEUE WORKER
    setTimeout(async () => {
      const trx = await db.transaction();
      try {
        if (ratingsToInsert.length > 0) await trx.batchInsert('global_student_feedback', ratingsToInsert, 100);
        if (facultyRemarksToInsert.length > 0) await trx('global_faculty_remarks').insert(facultyRemarksToInsert);
        if (sectionRemarksToInsert.length > 0) await trx('global_section_remarks').insert(sectionRemarksToInsert);

        for (const score of scorecardUpdatesToInsert) {
          await trx.raw(`
            INSERT INTO global_faculty_scorecards (
              dept_id, faculty_id, course_id, session_id, total_score_sum, ratings_count, genuine_count, excellent_count, good_count, average_count, poor_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              total_score_sum = total_score_sum + VALUES(total_score_sum),
              ratings_count = ratings_count + VALUES(ratings_count),
              genuine_count = genuine_count + VALUES(genuine_count),
              excellent_count = excellent_count + VALUES(excellent_count),
              good_count = good_count + VALUES(good_count),
              average_count = average_count + VALUES(average_count),
              poor_count = poor_count + VALUES(poor_count)
          `, [score.dept_id, score.faculty_id, score.course_id, score.session_id, score.sum, score.count, score.genuineCount, score.excellent, score.good, score.average, score.poor]);
        }

        if (department_remark && department_remark.trim() !== "") {
          await trx('global_session_remarks').insert({
            session_id, remark_text: department_remark.trim(), dept_id
          });
        }

        await trx.commit();
        
        // Notify realtime dashboards
        const io = req.app.get('io');
        if (io) io.emit("NEW_FEEDBACK_RECEIVED", { dept_id });

        await logActivity(req, dept_id, 'SUBMIT', 'FEEDBACK', `Anonymous feedback submitted for session ${session_id} (${ratingsToInsert.length} ratings processed)`, 'SUCCESS');

        // Phase 6: Vector Embeddings
        const { generateEmbedding } = require('../utils/embedder');
        for (const r of facultyRemarksToInsert) {
          const vector = await generateEmbedding(r.remark_text);
          if (vector) await db('global_faculty_remarks').where({ session_id: r.session_id, faculty_id: r.faculty_id, course_id: r.course_id, remark_text: r.remark_text }).update({ embedding: JSON.stringify(vector) });
        }
        for (const r of sectionRemarksToInsert) {
          const vector = await generateEmbedding(r.remark_text);
          if (vector) await db('global_section_remarks').where({ session_id: r.session_id, faculty_id: r.faculty_id, course_id: r.course_id, section_heading: r.section_heading, remark_text: r.remark_text }).update({ embedding: JSON.stringify(vector) });
        }
        if (department_remark && department_remark.trim() !== "") {
          const vector = await generateEmbedding(department_remark);
          if (vector) await db('global_session_remarks').where({ session_id, dept_id, remark_text: department_remark.trim() }).update({ embedding: JSON.stringify(vector) });
        }

      } catch (ingestErr) {
        if (trx && !trx.isCompleted()) await trx.rollback();
        console.error("Background Ingestion Error:", ingestErr);
        // Fail-safe: Revert student status so they can try again
        await db('global_students').where({ usn: student.usn, dept_id, session_id }).update({ session_id: null, feedback_given: 'pending' });
        await db('global_used_tokens').where({ token: idempotency_key }).del().catch(()=>{});
      }
    }, 0);

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
  try {
    const rows = await db('global_feedback_questions')
      .whereRaw('UPPER(dept_id) = ?', [dept_id])
      .orderBy(['question_heading', 'question_id']);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};

const getStudentQuestions = async (req, res) => {
  const { session_id } = req.params;
  try {
    const session = await db('global_sessions').where({ session_id }).first();
    if (!session) return res.status(404).json({ error: "Session not found" });

    const rows = await db('global_feedback_questions')
      .whereRaw('UPPER(dept_id) = ?', [session.dept_id.toUpperCase()])
      .orderBy(['question_heading', 'question_id']);
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

  try {
    let insertedCount = 0;
    for (const q of questions) {
      const text = typeof q === "string" ? q : (q.question_text || q.text);
      const heading = typeof q === "string" ? "General Feedback" : (q.question_heading || q.heading || "General Feedback");
      await db('global_feedback_questions').insert({ question_text: text, question_heading: heading, dept_id });
      insertedCount++;
    }
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'UPLOAD', 'QUESTION', `Bulk uploaded ${insertedCount} feedback questions`);
    }

    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    console.error("Bulk Question Upload Error:", err);
    res.status(500).json({ error: "Failed to upload questions" });
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
