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
  
  // Enforce 5-minute minimum dwell time
  // MIN_TIME in milliseconds (5 minutes = 5 * 60 * 1000)
  const MIN_TIME = 5 * 60 * 1000; 
  if (req.session.feedback_start_time) {
    const timeSpent = Date.now() - req.session.feedback_start_time;
    if (timeSpent < MIN_TIME) {
      const remainingSecs = Math.ceil((MIN_TIME - timeSpent) / 1000);
      return res.status(400).json({ error: `Please take time to read and evaluate. You can submit in ${remainingSecs} seconds.` });
    }
  } else {
    // If somehow start time is missing, set it now and force them to wait
    req.session.feedback_start_time = Date.now();
    return res.status(400).json({ error: `Session timer restarted. Please review the feedback for 5 minutes before submitting.` });
  }

  const trx = await db.transaction();
  try {
    // IDEMPOTENCY CHECK: Try to insert the token. If it already exists, it throws ER_DUP_ENTRY and aborts immediately.
    try {
      await trx('global_used_tokens').insert({ token: idempotency_key });
    } catch (tokenErr) {
      if (tokenErr.code === 'ER_DUP_ENTRY') {
        throw new Error("Duplicate submission detected. Feedback already submitted.");
      }
      throw tokenErr;
    }

    const dept_id = student.dept_id; // from login

    // Lock the student row to prevent race conditions
    const studentRow = await trx('global_students')
      .where({ usn: student.usn, dept_id })
      .select('feedback_given', 'session_id')
      .forUpdate()
      .first();

    if (!studentRow) {
      throw new Error("Student record not found");
    }

    if (studentRow.session_id === session_id && studentRow.feedback_given === "done") {
      throw new Error("Feedback already submitted");
    }

    // Shadowban Variance Check
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

    // =========================================================================
    // ENHANCEMENT: High-Performance Bulk Insertion & In-Memory Staging
    // =========================================================================
    const ratingsToInsert = [];
    const facultyRemarksToInsert = [];
    const sectionRemarksToInsert = [];

    // Phase 1: Fast in-memory validation and staging (0 DB queries)
    for (let i = 0; i < facultyList.length; i++) {
      const faculty = facultyList[i];
      if (!faculty.faculty_id || !faculty.course_id) {
        throw new Error("Invalid faculty data");
      }

      const feedback = faculty.feedback || {};
      const questionIds = Object.keys(feedback);
      
      if (questionIds.length === 0) {
        throw new Error("No feedback ratings provided");
      }

      for (let qId of questionIds) {
        const rawRating = feedback[qId];
        const rating = Number(rawRating);

        // Fail-Fast: Strict integer validation (1 to 5)
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          throw new Error(`Invalid rating for question ${qId}. Must be between 1 and 5.`);
        }

        ratingsToInsert.push({
          faculty_id: faculty.faculty_id,
          course_id: faculty.course_id,
          question_id: qId,
          rating,
          session_id,
          dept_id,
          is_genuine: isGenuine
        });
      }

      // Stage faculty-specific remark if provided
      if (faculty.remark && typeof faculty.remark === 'string' && faculty.remark.trim() !== "") {
        facultyRemarksToInsert.push({
          session_id,
          dept_id,
          faculty_id: faculty.faculty_id,
          course_id: faculty.course_id,
          remark_text: faculty.remark.trim()
        });
      }

      // Stage section-specific remarks if provided
      if (faculty.section_remarks && typeof faculty.section_remarks === 'object') {
        for (const [section_heading, remark_text] of Object.entries(faculty.section_remarks)) {
          if (remark_text && typeof remark_text === 'string' && remark_text.trim() !== "") {
            sectionRemarksToInsert.push({
              session_id,
              dept_id,
              faculty_id: faculty.faculty_id,
              course_id: faculty.course_id,
              section_heading,
              remark_text: remark_text.trim()
            });
          }
        }
      }
    }

    // Phase 2: Vector Bulk Insert (Safe batching and empty payload checks)
    if (ratingsToInsert.length > 0) {
      await trx.batchInsert('global_student_feedback', ratingsToInsert, 100);
    }

    if (facultyRemarksToInsert.length > 0) {
      await trx('global_faculty_remarks').insert(facultyRemarksToInsert);
    }

    if (sectionRemarksToInsert.length > 0) {
      await trx('global_section_remarks').insert(sectionRemarksToInsert);
    }

    // Mark feedback as done for this student
    await trx('global_students')
      .where({ usn: student.usn, dept_id })
      .update({ session_id, feedback_given: 'done' });
    
    // Save optional department remark anonymously
    if (department_remark && department_remark.trim() !== "") {
      await trx('global_session_remarks').insert({
        session_id,
        remark_text: department_remark.trim(),
        dept_id
      });
    }
    
    const sessRow = await trx('global_sessions').where({ session_id, dept_id }).first();

    await trx.commit();
    
    // In actual production, emit socket event here. Assuming we can get io from somewhere, 
    // or just let the socket logic handle it via a global app variable if needed.
    const io = req.app.get('io');
    if (io) {
      io.emit("NEW_FEEDBACK_RECEIVED", { dept_id });
    }

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("Error submitting feedback:", err);
    res.status(err.message === "Feedback already submitted" ? 403 : 500).json({ error: err.message || "Server error" });
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
    const rows = await db('global_student_feedback')
      .where({ faculty_id, dept_id, is_genuine: true })
      .select('course_id')
      .avg('rating as avg_rating')
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
    const rows = await db('global_student_feedback as f')
      .join('global_feedback_questions as q', 'f.question_id', 'q.question_id')
      .where({ 'f.faculty_id': faculty_id, 'f.course_id': course_id, 'f.dept_id': dept_id, 'f.is_genuine': true })
      .select('f.question_id', 'q.question_text', 'q.question_heading')
      .avg('f.rating as avg_rating')
      .groupBy('f.question_id', 'q.question_text', 'q.question_heading')
      .orderBy('f.question_id');
    res.json(rows);
  } catch (err) {
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
  getQuestionsAvg
};
