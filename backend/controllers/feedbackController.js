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
      .where({ usn: student.usn, session_id: student.session_id, dept_id })
      .select('feedback_given')
      .forUpdate()
      .first();

    if (!studentRow) {
      throw new Error("Student session not found");
    }

    if (studentRow.feedback_given === "done") {
      throw new Error("Feedback already submitted");
    }

    // Store feedback anonymously (no USN)
    for (let i = 0; i < facultyList.length; i++) {
      const faculty = facultyList[i];
      if (!faculty.faculty_id || !faculty.course_id) 
        throw new Error("Invalid faculty data");

      const feedback = faculty.feedback; // object {question_id: rating, ...}
      const questionIds = Object.keys(feedback);
      
      if (questionIds.length === 0) {
        throw new Error("No feedback ratings provided");
      }

      for (let qId of questionIds) {
        const rating = feedback[qId];
        if (rating == null) 
          throw new Error(`Missing rating for question ${qId}`);

        await trx('global_student_feedback').insert({
          faculty_id: faculty.faculty_id,
          course_id: faculty.course_id,
          question_id: qId,
          rating,
          session_id,
          dept_id
        });
      }
    }

    // Mark feedback as done for this student
    await trx('global_students')
      .where({ usn: student.usn, session_id: student.session_id, dept_id })
      .update({ feedback_given: 'done' });
    
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
    // req.app.get('io').emit("NEW_FEEDBACK_RECEIVED", { dept_id });

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
      .where({ faculty_id, dept_id })
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
      .where({ 'f.faculty_id': faculty_id, 'f.course_id': course_id, 'f.dept_id': dept_id })
      .select('f.question_id', 'q.question_text')
      .avg('f.rating as avg_rating')
      .groupBy('f.question_id', 'q.question_text')
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
