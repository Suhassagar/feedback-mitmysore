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
      const targetDeptId = req.session?.role === 'department' ? req.session.dept_id : (s.dept_id || req.body.dept_id);
      if (!targetDeptId) continue;

      // Upsert student
      const existing = await trx('global_students').where({ usn: s.usn, dept_id: targetDeptId }).first();
      if (existing) {
        await trx('global_students').where({ usn: s.usn, dept_id: targetDeptId }).update({
          name: s.name,
          sem: s.sem,
          section: s.section,
          email: s.email || null
        });
      } else {
        await trx('global_students').insert({
          usn: s.usn,
          dept_id: targetDeptId,
          name: s.name,
          sem: s.sem,
          section: s.section,
          email: s.email || null
        });
        insertedCount++;
      }
      
      // Upsert global_directory
      await trx('global_directory')
        .insert({ user_id: s.usn, role: 'student', dept_id: targetDeptId })
        .onConflict('user_id').ignore();
    }

    if (students.length > 0) {
      const logDept = req.session?.dept_id || students[0].dept_id || 'ADMIN';
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
  const dept_id = req.session.dept_id || req.query.dept_id || req.body?.dept_id;
  const trx = await db.transaction();
  try {
    const dirQ = trx('global_directory').where({ user_id: usn, role: 'student' });
    const studQ = trx('global_students').where({ usn });
    if (dept_id) {
      dirQ.andWhere({ dept_id });
      studQ.andWhere({ dept_id });
    }
    await dirQ.del();
    await studQ.del();
    
    await logActivity(req, dept_id || 'ADMIN', 'DELETE', 'STUDENT', `Deleted student ${usn}`);
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
  const dept_id = req.session.dept_id || req.query.dept_id || req.body?.dept_id;

  if (!usns || !Array.isArray(usns) || usns.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const trx = await db.transaction();
  try {
    const dirQ = trx('global_directory').whereIn('user_id', usns).andWhere({ role: 'student' });
    const studQ = trx('global_students').whereIn('usn', usns);
    if (dept_id) {
      dirQ.andWhere({ dept_id });
      studQ.andWhere({ dept_id });
    }
    await dirQ.del();
    await studQ.del();
    
    await logActivity(req, dept_id || 'ADMIN', 'DELETE', 'STUDENT', `Bulk deleted ${usns.length} students`);
    await trx.commit();
    res.json({ message: `Successfully deleted ${usns.length} students` });
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
