const db = require('../config/db');
const { logActivity } = require('../utils/logger');

//=========================================================
// Get all students by department
//=========================================================
const getStudents = async (req, res) => {
  const { dept_id } = req.params;
  try {
    const rows = await db('global_students')
      .where({ dept_id })
      .orderBy(['sem', 'section', 'usn']);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: "Error fetching students" });
  }
};

//=========================================================
// Upload / Add Students
//=========================================================
const uploadStudents = async (req, res) => {
  const { students } = req.body; 
  if (!students || !Array.isArray(students)) return res.status(400).json({ error: "Invalid data format" });
  
  const trx = await db.transaction();
  try {
    let insertedCount = 0;
    for (const s of students) {
      const rawDeptId = req.session?.role === 'department' ? req.session.dept_id : (s.dept_id || req.body.dept_id);
      if (!rawDeptId || !s.usn || !s.name) continue;
      const targetDeptId = String(rawDeptId).trim().toUpperCase();

      const cleanUsn = String(s.usn).trim().toUpperCase();
      const cleanName = String(s.name).trim();
      const cleanSem = parseInt(s.sem, 10);
      const cleanSection = String(s.section || '').trim().toUpperCase();
      const cleanEmail = s.email ? String(s.email).trim().toLowerCase() : null;

      // Check if an active session exists for this department, semester, and section
      const activeSession = await trx('global_sessions')
        .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ? AND status = ?', [targetDeptId, cleanSem, cleanSection, 'active'])
        .first();

      const sessionIdToBind = activeSession ? activeSession.session_id : null;
      const initialFeedback = activeSession ? 'missing' : null;

      // Upsert student
      const existing = await trx('global_students').where({ usn: cleanUsn, dept_id: targetDeptId }).first();
      if (existing) {
        const updateData = {
          name: cleanName,
          sem: cleanSem,
          section: cleanSection,
          email: cleanEmail
        };
        // Auto-bind to active session if not already completed this session
        if (activeSession && (existing.session_id !== activeSession.session_id || existing.feedback_given !== 'done')) {
          updateData.session_id = sessionIdToBind;
          updateData.feedback_given = initialFeedback;
        }
        await trx('global_students').where({ usn: cleanUsn, dept_id: targetDeptId }).update(updateData);
      } else {
        await trx('global_students').insert({
          usn: cleanUsn,
          dept_id: targetDeptId,
          name: cleanName,
          sem: cleanSem,
          section: cleanSection,
          email: cleanEmail,
          session_id: sessionIdToBind,
          feedback_given: initialFeedback
        });
        insertedCount++;
      }
      
      // Upsert global_directory
      await trx('global_directory')
        .insert({ user_id: cleanUsn, role: 'student', dept_id: targetDeptId })
        .onConflict('user_id')
        .merge({ dept_id: targetDeptId, role: 'student' });
    }

    if (students.length > 0) {
      const logDept = req.session?.dept_id || (students[0].dept_id ? String(students[0].dept_id).toUpperCase() : 'ADMIN');
      await logActivity(req, logDept, 'UPLOAD', 'STUDENT', `Bulk uploaded/updated ${students.length} students`);
    }

    await trx.commit();
    res.json({ success: true, message: `Successfully processed ${students.length} students` });
  } catch (err) {
    await trx.rollback();
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Error uploading students" });
  }
};

//=========================================================
// Delete Single Student
//=========================================================
const deleteStudent = async (req, res) => {
  const { usn } = req.params;
  const cleanUsn = String(usn).trim().toUpperCase();
  const rawDept = req.session.dept_id || req.query.dept_id || req.body?.dept_id;
  const cleanDept = rawDept ? String(rawDept).trim().toUpperCase() : null;

  const trx = await db.transaction();
  try {
    const dirQ = trx('global_directory').where({ user_id: cleanUsn, role: 'student' });
    const studQ = trx('global_students').where({ usn: cleanUsn });
    if (cleanDept) {
      dirQ.andWhere({ dept_id: cleanDept });
      studQ.andWhere({ dept_id: cleanDept });
    }
    await dirQ.del();
    await studQ.del();
    
    await logActivity(req, cleanDept || 'ADMIN', 'DELETE', 'STUDENT', `Deleted student ${cleanUsn}`);
    await trx.commit();
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    await trx.rollback();
    console.error("Delete Student Error:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
};

//=========================================================
// Bulk Delete Students
//=========================================================
const bulkDeleteStudents = async (req, res) => {
  const { usns } = req.body;
  const rawDept = req.session.dept_id || req.query.dept_id || req.body?.dept_id;
  const cleanDept = rawDept ? String(rawDept).trim().toUpperCase() : null;

  if (!usns || !Array.isArray(usns) || usns.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const cleanUsns = usns.map(u => String(u).trim().toUpperCase());

  const trx = await db.transaction();
  try {
    const dirQ = trx('global_directory').whereIn('user_id', cleanUsns).andWhere({ role: 'student' });
    const studQ = trx('global_students').whereIn('usn', cleanUsns);
    if (cleanDept) {
      dirQ.andWhere({ dept_id: cleanDept });
      studQ.andWhere({ dept_id: cleanDept });
    }
    await dirQ.del();
    await studQ.del();
    
    await logActivity(req, cleanDept || 'ADMIN', 'DELETE', 'STUDENT', `Bulk deleted ${cleanUsns.length} students`);
    await trx.commit();
    res.json({ message: `Successfully deleted ${cleanUsns.length} students` });
  } catch (err) {
    await trx.rollback();
    console.error("Bulk Delete Students Error:", err);
    res.status(500).json({ error: "Failed to delete students" });
  }
};

module.exports = {
  getStudents,
  uploadStudents,
  deleteStudent,
  bulkDeleteStudents
};
