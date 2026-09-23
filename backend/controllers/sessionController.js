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
    
    const query = db('global_sessions');
    if (dept_id) {
      query.where({ dept_id });
    }
    
    const sessions = await query
      .select('session_id', 'sem', 'section', 'status', 'dept_id', db.raw("DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at"))
      .orderBy('status', 'desc');

    res.json(sessions);
  } catch (err) {
    console.error("Error loading sessions:", err);
    res.status(500).json({ message: "DB error", error: err });
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

module.exports = {
  createSession,
  getSessions,
  endSession,
  deleteSession,
  trackSession,
  notifyStudents
};
