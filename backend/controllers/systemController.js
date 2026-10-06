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

const { processAndUploadLogo } = require('../utils/imageProcessor');

const getDepartments = async (req, res) => {
  try {
    const rows = await db('department')
      .where({ is_active: true })
      .select('dept_id', 'dept_name', 'is_active', 'logo_url', 'brand_color', 'brand_accent', 'logo_lqip');
    return res.json(rows);
  } catch (err) {
    console.warn("[getDepartments] Connection error on first attempt, retrying with fresh connection...", err.message);
    try {
      const retryRows = await db('department')
        .where({ is_active: true })
        .select('dept_id', 'dept_name', 'is_active', 'logo_url', 'brand_color', 'brand_accent', 'logo_lqip');
      return res.json(retryRows);
    } catch (retryErr) {
      console.error("[getDepartments FATAL]:", retryErr.message);
      return res.status(500).json({ error: "Failed to load departments" });
    }
  }
};

const addDepartment = async (req, res) => {
  let { dept_id, dept_name, username, password } = req.body;
  if (dept_id) dept_id = dept_id.toUpperCase();
  if (dept_name) dept_name = dept_name.toUpperCase();
  if (username) username = username.toLowerCase();
  
  const pwd = password || "Dept@123";

  let logoData = {
    logo_url: null,
    logo_lqip: null
  };

  // If a logo file was uploaded with the multipart request
  if (req.file) {
    try {
      const processed = await processAndUploadLogo(req.file.buffer, dept_id || 'DEPT');
      logoData = {
        logo_url: processed.logo_url,
        logo_lqip: processed.logo_lqip
      };
    } catch (procErr) {
      console.warn("Logo processing warning during addDepartment:", procErr.message);
    }
  }

  const trx = await db.transaction();
  try {
    const hashedPassword = await bcrypt.hash(pwd, 10);
    await trx('department').insert({ 
      dept_id, 
      dept_name, 
      username, 
      password: hashedPassword,
      logo_url: logoData.logo_url,
      logo_lqip: logoData.logo_lqip
    });
    
    await trx.commit();
    res.json({ 
      success: true, 
      message: "Department created successfully",
      dept: {
        dept_id,
        dept_name,
        username,
        ...logoData
      }
    });
  } catch (err) {
    await trx.rollback();
    console.error("Department add error:", err);
    res.json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? "Department ID or Username already exists" : "Database Error" });
  }
};

const updateDepartmentLogo = async (req, res) => {
  let { dept_id } = req.params;
  if (!dept_id) return res.status(400).json({ success: false, message: "Department ID is required" });
  dept_id = dept_id.toUpperCase();

  // If role is department, ensure they are modifying their own department
  if (req.session.role === 'department' && req.session.dept_id.toUpperCase() !== dept_id) {
    return res.status(403).json({ success: false, message: "Unauthorized to update another department's logo" });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "No logo file provided" });
  }

  try {
    const existing = await db('department').where({ dept_id }).first();
    if (!existing) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    const processed = await processAndUploadLogo(req.file.buffer, dept_id, existing.logo_url);

    await db('department').where({ dept_id }).update({
      logo_url: processed.logo_url,
      logo_lqip: processed.logo_lqip
    });

    // Update active session if it's the current user's department
    if (req.session.dept_id && req.session.dept_id.toUpperCase() === dept_id) {
      req.session.logo_url = processed.logo_url;
      req.session.logo_lqip = processed.logo_lqip;
    }

    return res.json({
      success: true,
      message: "Department logo updated successfully",
      ...processed
    });
  } catch (err) {
    console.error("updateDepartmentLogo error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to process logo" });
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
      .where({ 'f.dept_id': dept_id, 'f.is_active': true })
      .select(
        'f.faculty_id',
        'f.name',
        'f.email',
        'f.position',
        'f.dob',
        'f.joining_date',
        db.raw('(SELECT COUNT(DISTINCT a.course_code) FROM global_assign a WHERE a.faculty_id = f.faculty_id AND a.dept_id = f.dept_id) as totalSubjects'),
        db.raw('(SELECT ROUND(COALESCE(AVG(sf.rating), 0), 2) FROM global_student_feedback sf WHERE sf.faculty_id = f.faculty_id AND sf.dept_id = f.dept_id AND sf.is_genuine = 1) as avg_rating'),
        db.raw('(SELECT COUNT(sf.rating) FROM global_student_feedback sf WHERE sf.faculty_id = f.faculty_id AND sf.dept_id = f.dept_id AND sf.is_genuine = 1) as total_feedback')
      );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching faculty by dept:", err);
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
  const cleanDeptId = String(dept_id).trim().toUpperCase();
  const trx = await db.transaction();
  try {
    let insertedCount = 0;
    for (const s of students) {
      if (!s.usn || !s.name) continue;
      const cleanUsn = String(s.usn).trim().toUpperCase();
      const cleanName = String(s.name).trim();
      const cleanSem = parseInt(s.sem, 10);
      const cleanSection = String(s.section || '').trim().toUpperCase();
      const cleanEmail = s.email ? String(s.email).trim().toLowerCase() : null;

      // Check if an active session exists for this department, semester, and section
      const activeSession = await trx('global_sessions')
        .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ? AND status = ?', [cleanDeptId, cleanSem, cleanSection, 'active'])
        .first();

      const sessionIdToBind = activeSession ? activeSession.session_id : null;
      const initialFeedback = activeSession ? 'missing' : null;

      const existing = await trx('global_students')
        .where({ usn: cleanUsn, dept_id: cleanDeptId })
        .first();

      if (existing) {
        const updateData = {
          name: cleanName,
          sem: cleanSem,
          section: cleanSection,
          email: cleanEmail
        };
        // Auto-bind to active session if not already done in this session
        if (activeSession && (existing.session_id !== activeSession.session_id || existing.feedback_given !== 'done')) {
          updateData.session_id = sessionIdToBind;
          updateData.feedback_given = initialFeedback;
        }
        await trx('global_students')
          .where({ usn: cleanUsn, dept_id: cleanDeptId })
          .update(updateData);
      } else {
        await trx('global_students').insert({
          usn: cleanUsn,
          dept_id: cleanDeptId,
          name: cleanName,
          sem: cleanSem,
          section: cleanSection,
          email: cleanEmail,
          session_id: sessionIdToBind,
          feedback_given: initialFeedback
        });
        insertedCount++;
      }

      // Upsert global_directory with uppercase user_id
      await trx('global_directory')
        .insert({ user_id: cleanUsn, role: 'student', dept_id: cleanDeptId })
        .onConflict('user_id')
        .merge({ dept_id: cleanDeptId, role: 'student' });
    }

    if (req.session?.role === 'department') {
      await logActivity(req, cleanDeptId, 'UPLOAD', 'STUDENT', `Bulk uploaded/processed ${students.length} students`);
    }

    await trx.commit();
    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    await trx.rollback();
    console.error("Bulk upload students error:", err);
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
        db.raw(`(SELECT ROUND(COALESCE(AVG(sf.rating), 0), 2) FROM global_student_feedback sf WHERE sf.faculty_id = a.faculty_id AND sf.course_id = a.course_code AND sf.dept_id = ? AND sf.is_genuine = 1) as avg_rating`, [dept_id])
      );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getDepartmentTiming = async (req, res) => {
  let { dept_id } = req.params;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const dept = await db('department').where({ dept_id }).first();
    if (!dept) {
      return res.status(404).json({ error: "Department not found" });
    }
    const min_time_sec = dept.feedback_min_time_sec != null ? Number(dept.feedback_min_time_sec) : 300;
    res.json({
      dept_id,
      min_time_sec,
      is_timer_enabled: min_time_sec > 0
    });
  } catch (err) {
    console.error("Error fetching department timing:", err);
    res.status(500).json({ error: "Database error" });
  }
};

const updateDepartmentTiming = async (req, res) => {
  let { dept_id } = req.params;
  let { min_time_sec } = req.body;
  if (dept_id) dept_id = dept_id.toUpperCase();

  min_time_sec = parseInt(min_time_sec, 10);
  if (isNaN(min_time_sec) || min_time_sec < 0 || min_time_sec > 1800) {
    return res.status(400).json({ error: "Invalid duration. Duration must be between 0 and 1800 seconds (30 minutes)." });
  }

  try {
    await db('department').where({ dept_id }).update({ feedback_min_time_sec: min_time_sec });
    await logActivity(req, dept_id, 'UPDATE', 'SETTINGS', `Updated feedback form submission dwell timer to ${min_time_sec} seconds`);
    res.json({
      success: true,
      dept_id,
      min_time_sec,
      is_timer_enabled: min_time_sec > 0,
      message: "Submission timer updated successfully"
    });
  } catch (err) {
    console.error("Error updating department timing:", err);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = {
  getDepartments, addDepartment, updateDepartmentLogo, addCourse, getCourses, getFacultyByDept,
  assignSubject, getFacultyAssignments, getNotes, addNote, getNotifications,
  markNotificationRead, bulkUploadStudents, globalSearch, removeFacultyAssignment, getFacultyAssignedSubjects,
  getDepartmentTiming, updateDepartmentTiming
};
