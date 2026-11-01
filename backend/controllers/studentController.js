const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const { escapeSqlLike } = require('../utils/sanitizer');

//=========================================================
// Get all students by department
//=========================================================
const getStudents = async (req, res) => {
  const { dept_id } = req.params;
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
  const sem = req.query.sem ? parseInt(req.query.sem, 10) : null;
  const search = req.query.search ? String(req.query.search).trim() : null;

  try {
    const cleanDept = String(dept_id).trim().toUpperCase();
    let baseQuery = db('global_students').whereRaw('UPPER(dept_id) = ?', [cleanDept]);
    if (sem) baseQuery = baseQuery.where({ sem });
    if (search) {
      const safeSearch = escapeSqlLike(search);
      baseQuery = baseQuery.where(function() {
        this.where('usn', 'like', `%${safeSearch}%`).orWhere('name', 'like', `%${safeSearch}%`);
      });
    }

    if (page && limit) {
      const offset = (page - 1) * limit;
      const countRes = await baseQuery.clone().count('* as count').first();
      const rows = await baseQuery
        .clone()
        .orderBy(['sem', 'section', 'usn'])
        .limit(limit)
        .offset(offset);

      return res.json({
        data: rows,
        pagination: {
          total: countRes?.count || 0,
          page,
          limit,
          totalPages: Math.ceil((countRes?.count || 0) / limit)
        }
      });
    }

    const rows = await baseQuery.orderBy(['sem', 'section', 'usn']);
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
      const cleanEmail = (s.email && String(s.email).trim()) ? String(s.email).trim().toLowerCase() : null;

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

//=========================================================
// Update Single Student
//=========================================================
const updateStudent = async (req, res) => {
  const { usn } = req.params;
  const { name, sem, section, email } = req.body;
  const targetUsn = req.body.usn ? String(req.body.usn).trim().toUpperCase() : null;

  if (!usn) {
    return res.status(400).json({ error: "USN parameter is required" });
  }

  const cleanOldUsn = String(usn).trim().toUpperCase();
  const cleanNewUsn = targetUsn || cleanOldUsn;

  // Tenant guard: Department coordinators can only update their own students
  const sessionDept = req.session?.role === 'department' ? req.session.dept_id : null;
  const rawDept = sessionDept || req.body.dept_id || req.query.dept_id;
  const cleanDept = rawDept ? String(rawDept).trim().toUpperCase() : null;

  const trx = await db.transaction();
  try {
    let studentQuery = trx('global_students').where({ usn: cleanOldUsn });
    if (cleanDept) studentQuery = studentQuery.andWhere({ dept_id: cleanDept });
    const existing = await studentQuery.first();

    if (!existing) {
      await trx.rollback();
      return res.status(404).json({ error: `Student with USN '${cleanOldUsn}' not found` });
    }

    const effectiveDeptId = existing.dept_id;
    const cleanName = name !== undefined ? String(name).trim() : existing.name;
    const cleanSem = sem !== undefined ? parseInt(sem, 10) : existing.sem;
    const cleanSection = section !== undefined ? String(section).trim().toUpperCase() : existing.section;
    const cleanEmail = email !== undefined 
      ? ((email && String(email).trim()) ? String(email).trim().toLowerCase() : null)
      : existing.email;

    if (!cleanName) {
      await trx.rollback();
      return res.status(400).json({ error: "Student name cannot be empty" });
    }
    if (isNaN(cleanSem) || cleanSem < 1 || cleanSem > 8) {
      await trx.rollback();
      return res.status(400).json({ error: "Semester must be a valid number between 1 and 8" });
    }
    if (!cleanSection || !/^[A-H]$/.test(cleanSection)) {
      await trx.rollback();
      return res.status(400).json({ error: "Section must be a single letter between A and H" });
    }

    // Check if USN is being changed and ensure new USN is not a duplicate
    const usnChanged = cleanNewUsn !== cleanOldUsn;
    if (usnChanged) {
      const duplicateCheck = await trx('global_students')
        .where({ usn: cleanNewUsn, dept_id: effectiveDeptId })
        .first();
      if (duplicateCheck) {
        await trx.rollback();
        return res.status(409).json({ error: `Cannot change USN: Student with USN '${cleanNewUsn}' already exists in this department.` });
      }
    }

    // Active session rebinding logic:
    // If sem or section changed, check if an active session exists in the new target sem/section
    let sessionId = existing.session_id;
    let feedbackGiven = existing.feedback_given;

    const semOrSecChanged = cleanSem !== existing.sem || cleanSection !== existing.section;
    if (semOrSecChanged) {
      // If student hasn't already completed feedback, rebind to active session of new section
      if (existing.feedback_given !== 'done') {
        const activeSession = await trx('global_sessions')
          .whereRaw('UPPER(dept_id) = ? AND sem = ? AND UPPER(TRIM(section)) = ? AND status = ?', [
            effectiveDeptId, cleanSem, cleanSection, 'active'
          ])
          .first();

        sessionId = activeSession ? activeSession.session_id : null;
        feedbackGiven = activeSession ? 'missing' : null;
      }
    }

    const updatePayload = {
      name: cleanName,
      sem: cleanSem,
      section: cleanSection,
      email: cleanEmail,
      session_id: sessionId,
      feedback_given: feedbackGiven
    };

    if (usnChanged) {
      updatePayload.usn = cleanNewUsn;
    }

    await trx('global_students')
      .where({ usn: cleanOldUsn, dept_id: effectiveDeptId })
      .update(updatePayload);

    // If USN changed, sync global_directory
    if (usnChanged) {
      await trx('global_directory')
        .where({ user_id: cleanOldUsn, role: 'student' })
        .update({ user_id: cleanNewUsn, dept_id: effectiveDeptId });
    }

    // Write audit log
    const changes = [];
    if (usnChanged) changes.push(`USN: ${cleanOldUsn} → ${cleanNewUsn}`);
    if (cleanName !== existing.name) changes.push(`Name: '${existing.name}' → '${cleanName}'`);
    if (cleanSem !== existing.sem) changes.push(`Sem: ${existing.sem} → ${cleanSem}`);
    if (cleanSection !== existing.section) changes.push(`Sec: ${existing.section} → ${cleanSection}`);
    if (cleanEmail !== existing.email) changes.push(`Email: '${existing.email || "none"}' → '${cleanEmail || "none"}'`);

    const logDesc = changes.length > 0 
      ? `Updated student ${cleanOldUsn} (${changes.join(', ')})`
      : `Updated student ${cleanOldUsn}`;

    await logActivity(req, effectiveDeptId, 'UPDATE', 'STUDENT', logDesc);

    await trx.commit();

    const updatedStudent = {
      usn: cleanNewUsn,
      dept_id: effectiveDeptId,
      name: cleanName,
      sem: cleanSem,
      section: cleanSection,
      email: cleanEmail,
      session_id: sessionId,
      feedback_given: feedbackGiven
    };

    res.json({
      success: true,
      message: "Student information updated successfully",
      student: updatedStudent
    });
  } catch (err) {
    await trx.rollback();
    console.error("Update Student Error:", err);
    res.status(500).json({ error: "Failed to update student information" });
  }
};

module.exports = {
  getStudents,
  uploadStudents,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents
};
