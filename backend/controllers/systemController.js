const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const bcrypt = require('bcrypt');
const crypto = require("crypto");

// --- Encryption Helpers for Notes ---
const ENCRYPTION_KEY = crypto.scryptSync(process.env.SESSION_SECRET || 'fallback', 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  let textParts = text.split(':');
  if (textParts.length !== 2) return text;
  try {
    let iv = Buffer.from(textParts[0], 'hex');
    let encryptedText = Buffer.from(textParts[1], 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return "[Encrypted Message - Decryption Failed]";
  }
}

const getDepartments = async (req, res) => {
  try {
    const rows = await db('department').where({ is_active: true });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
};

const addDepartment = async (req, res) => {
  let { dept_id, dept_name, username, password } = req.body;
  if (dept_id) dept_id = dept_id.toUpperCase();
  if (dept_name) dept_name = dept_name.toUpperCase();
  if (username) username = username.toLowerCase();
  
  const pwd = password || "Dept@123";
  const trx = await db.transaction();
  try {
    const hashedPassword = await bcrypt.hash(pwd, 10);
    await trx('department').insert({ dept_id, dept_name, username, password: hashedPassword });
    
    // Seed default feedback questions for the new department
    const templateQuestions = await trx('global_feedback_questions').where({ dept_id: 'CSE' }).orWhere({ dept_id: 'cse' });
    if (templateQuestions.length > 0) {
      const seededQuestions = templateQuestions.map(q => ({
        dept_id,
        question_text: q.question_text,
        question_heading: q.question_heading || 'General Feedback'
      }));
      await trx('global_feedback_questions').insert(seededQuestions);
    }
    
    await trx.commit();
    res.json({ success: true, message: "Department created and initialized successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("Department add error:", err);
    res.json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? "Department ID or Username already exists" : "Database Error" });
  }
};

const addCourse = async (req, res) => {
  let { course_name, course_code, sem } = req.body;
  let dept_id = req.body.dept_id || req.session?.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    await db('global_course').insert({ course_code, course_name, sem, dept_id, is_active: true });
    res.json({ success: true, message: "Course added successfully" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "Course code already exists." });
    }
    res.status(500).json({ success: false, message: "Database error" });
  }
};

const getCourses = async (req, res) => {
  let { dept_id } = req.params;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const rows = await db('global_course')
      .where({ dept_id, is_active: true })
      .orderBy(['sem', 'course_code']);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const getFacultyByDept = async (req, res) => {
  let { dept_id } = req.params;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const rows = await db('global_faculty as f')
      .leftJoin('global_assign as a', 'f.faculty_id', 'a.faculty_id')
      .where({ 'f.dept_id': dept_id, 'f.is_active': true })
      .select('f.faculty_id', 'f.name', 'f.email', 'f.position', 'f.dob', 'f.joining_date')
      .count('a.course_code as totalSubjects')
      .groupBy('f.faculty_id', 'f.name', 'f.email', 'f.position', 'f.dob', 'f.joining_date');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const assignSubject = async (req, res) => {
  let { faculty_id, course_code, sem, section } = req.body;
  if (faculty_id) faculty_id = faculty_id.toUpperCase();
  const dept_id = req.session?.dept_id || req.body?.dept_id;
  try {
    await db('global_assign').insert({ faculty_id, course_code, sem, section, dept_id });
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'CREATE', 'ASSIGNMENT', `Assigned ${course_code} (Sem ${sem}, Sec ${section}) to ${faculty_id}`);
    }
    res.json({ success: true, message: "Subject assigned successfully" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "This subject is already assigned for this semester and section." });
    }
    res.status(500).json({ success: false, message: "Database Error", error: err.message });
  }
};

const getFacultyAssignments = async (req, res) => {
  const { faculty_id } = req.params;
  const dept_id = req.session?.dept_id || req.query?.dept_id || req.query?.dept;
  try {
    const rows = await db('global_assign as a')
      .join('global_course as c', function() {
        this.on('a.course_code', '=', 'c.course_code').andOn('a.dept_id', '=', 'c.dept_id');
      })
      .where({ 'a.faculty_id': faculty_id, 'a.dept_id': dept_id })
      .select('a.course_code', 'c.course_name', 'a.sem', 'a.section');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const getNotes = async (req, res) => {
  const { faculty_id } = req.params;
  const dept_id = req.session?.dept_id || req.query?.dept_id || req.query?.dept;
  try {
    const notes = await db('global_faculty_notes').where({ faculty_id, dept_id }).orderBy('created_at', 'desc');
    const decrypted = notes.map(n => ({ ...n, note_text: decrypt(n.note_text) }));
    res.json(decrypted);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const addNote = async (req, res) => {
  const note_text = req.body.note_text;
  let faculty_id = req.body.faculty_id;
  
  if (req.session.role === 'faculty') {
    faculty_id = req.session.faculty_id;
  }
  
  const dept_id = req.session?.dept_id || req.body?.dept_id || req.query?.dept;
  const sender_type = req.session.role || 'department'; // fallback to department
  if (!faculty_id || !note_text) return res.status(400).json({ error: "Missing fields" });
  try {
    const encryptedText = encrypt(note_text);
    await db('global_faculty_notes').insert({ faculty_id, note_text: encryptedText, dept_id, sender_type });
    res.json({ success: true, message: "Note added successfully" });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const getNotifications = async (req, res) => {
  const faculty_id = req.session?.faculty_id || req.query.faculty_id;
  const dept_id = req.session.role === 'faculty' ? (req.query.dept || req.session.dept_id) : req.session.dept_id;
  try {
    const notes = await db('global_faculty_notes').where({ faculty_id, dept_id }).orderBy('created_at', 'desc');
    const decrypted = notes.map(n => ({ ...n, note_text: decrypt(n.note_text) }));
    res.json(decrypted);
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const markNotificationRead = async (req, res) => {
  const { note_id } = req.params;
  const dept_id = req.session.role === 'faculty' ? (req.query.dept || req.session.dept_id) : req.session.dept_id;
  try {
    await db('global_faculty_notes').where({ note_id, dept_id }).update({ is_read: 1 });
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "DB error" });
  }
};

const bulkUploadStudents = async (req, res) => {
  const { dept_id, students } = req.body;
  if (!dept_id || !students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const trx = await db.transaction();
  try {
    let insertedCount = 0;
    for (const s of students) {
      await trx('global_students').insert({ usn: s.usn, name: s.name, sem: s.sem, section: s.section, email: s.email || null, dept_id })
        .onConflict(['usn']).merge(['name', 'sem', 'section', 'email']);
      await trx('global_directory').insert({ user_id: s.usn, role: 'student', dept_id }).onConflict(['user_id']).ignore();
      insertedCount++;
    }
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'UPLOAD', 'STUDENT', `Bulk uploaded ${insertedCount} students`);
    }
    await trx.commit();
    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ error: "DB error" });
  }
};

const globalSearch = async (req, res) => {
  const { dept_id } = req.params;
  const q = req.query.q || "";
  if (!q.trim()) return res.json({ faculty: [], students: [], sessions: [] });
  try {
    const search = `%${q}%`;
    const faculty = await db('global_faculty').where({ dept_id })
      .andWhere(function() { this.where('name', 'like', search).orWhere('faculty_id', 'like', search); })
      .select('faculty_id as id', 'name', 'email as subtext').limit(5);

    const students = await db('global_students').where({ dept_id })
      .andWhere(function() { this.where('name', 'like', search).orWhere('usn', 'like', search); })
      .select('usn as id', 'name', db.raw("CONCAT('Sem ', sem, ' - Sec ', section) as subtext")).limit(5);

    const sessions = await db('global_sessions').where({ dept_id })
      .andWhere(function() { this.where('session_id', 'like', search).orWhere('sem', 'like', search).orWhere('section', 'like', search); })
      .select('session_id as id', db.raw("CONCAT('Sem ', sem, ' - Sec ', section) as name"), 'status as subtext').limit(5);

    res.json({ faculty, students, sessions });
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
};

// also remove faculty assigned logic:
const removeFacultyAssignment = async (req, res) => {
  const { faculty_id, course_code } = req.params;
  const dept_id = req.session?.dept_id || req.query?.dept_id || req.query?.dept || req.body?.dept_id;
  try {
    await db('global_assign').where({ faculty_id, course_code, dept_id }).del();
    res.json({ success: true, message: "Assigned subject removed" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getFacultyAssignedSubjects = async (req, res) => {
  const { faculty_id } = req.params;
  const dept_id = req.session?.dept_id || req.query?.dept_id || req.query?.dept;
  try {
    const rows = await db('global_assign as a')
      .join('global_course as c', function() {
        this.on('a.course_code', '=', 'c.course_code').andOn('a.dept_id', '=', 'c.dept_id');
      })
      .where({ 'a.faculty_id': faculty_id, 'a.dept_id': dept_id })
      .select(
        'a.course_code', 'c.course_id', 'c.course_name', 'a.sem', 'a.section',
        db.raw(`(SELECT AVG(sf.rating) FROM global_student_feedback sf WHERE sf.faculty_id = a.faculty_id AND sf.course_id = a.course_code AND sf.dept_id = ?) as avg_rating`, [dept_id])
      );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getDepartments, addDepartment, addCourse, getCourses, getFacultyByDept,
  assignSubject, getFacultyAssignments, getNotes, addNote, getNotifications,
  markNotificationRead, bulkUploadStudents, globalSearch, removeFacultyAssignment, getFacultyAssignedSubjects
};
