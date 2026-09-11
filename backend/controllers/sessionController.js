const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const { sendFeedbackEmail } = require('../utils/emailService');

//=========================================================
// Create session
//=========================================================
const createSession = async (req, res) => {
  let { session_id, dept_id, sem, section } = req.body;
  if (dept_id) dept_id = dept_id.toUpperCase();

  const trx = await db.transaction();
  try {
    // GATE 1: Student Check
    const students = await trx('global_students')
      .where({ sem, section, dept_id })
      .count('* as count')
      .first();
      
    if (students.count === 0) {
      await trx.rollback();
      return res.status(400).json({ error: `Cannot create session: No students are currently registered in Sem ${sem} Section ${section}.` });
    }

    // GATE 2: Faculty/Course Assignment Check
    // We check the new 'global_assign' table (assuming it's global now or we query by dept_id)
    // Actually, 'assign' is a tenant table in the old code. We should have 'global_assign' from Phase 2.
    // If not, we use 'global_assign' where dept_id = ? 
    // Wait, let's just query 'global_assign'
    const assignments = await trx('global_assign')
      .where({ sem, section, dept_id })
      .count('* as count')
      .first();

    if (assignments.count === 0) {
      await trx.rollback();
      return res.status(400).json({ error: `Cannot create session: No faculty have been assigned to teach Sem ${sem} Section ${section} yet.` });
    }

    // Check if an active session already exists
    const existing = await trx('global_sessions')
      .where({ sem, section, dept_id, status: 'active' })
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
      .where({ sem, section, dept_id })
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

    const trackRows = await db('global_students')
      .where({ session_id, sem: session.sem, section: session.section, dept_id: session.dept_id })
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
  const dept_id = req.session?.dept_id || req.body?.dept_id; // Added optional chaining

  try {
    const students = await db('global_students')
      .where({ session_id, dept_id })
      .whereNotNull('email')
      .andWhere('email', '!=', '');

    if (students.length === 0) {
      return res.status(400).json({ success: false, error: "No students with valid email addresses found for this session." });
    }

    let successCount = 0;
    let failCount = 0;

    const emailPromises = students.map(student => 
      sendFeedbackEmail(student.email, student.name, student.usn, session_id)
        .then(() => successCount++)
        .catch((err) => {
          console.error(`Failed to send email to ${student.email}:`, err);
          failCount++;
        })
    );

    await Promise.allSettled(emailPromises);

    res.json({ 
      success: true, 
      message: `Emails sent successfully to ${successCount} students. ${failCount > 0 ? `Failed to send to ${failCount} students.` : ''}` 
    });
  } catch (err) {
    console.error("Notify error:", err);
    res.status(500).json({ success: false, error: "An error occurred while sending emails. Check server logs." });
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
