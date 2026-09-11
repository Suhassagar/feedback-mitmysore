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
      // Upsert student
      const existing = await trx('global_students').where({ usn: s.usn, dept_id: s.dept_id }).first();
      if (existing) {
        await trx('global_students').where({ usn: s.usn, dept_id: s.dept_id }).update({
          name: s.name,
          sem: s.sem,
          section: s.section,
          email: s.email || null
        });
      } else {
        await trx('global_students').insert({
          usn: s.usn,
          dept_id: s.dept_id,
          name: s.name,
          sem: s.sem,
          section: s.section,
          email: s.email || null
        });
        insertedCount++;
      }
      
      // Upsert global_directory
      await trx('global_directory')
        .insert({ user_id: s.usn, role: 'student', dept_id: s.dept_id })
        .onConflict('user_id').ignore();
    }

    if (req.session?.role === 'department' && students.length > 0) {
      await logActivity(req, students[0].dept_id, 'UPLOAD', 'STUDENT', `Bulk uploaded/updated ${students.length} students`);
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
  const dept_id = req.session.dept_id; // Assume dept context
  const trx = await db.transaction();
  try {
    await trx('global_directory').where({ user_id: usn, role: 'student', dept_id }).del();
    await trx('global_students').where({ usn, dept_id }).del();
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'DELETE', 'STUDENT', `Deleted student ${usn}`);
    }
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
  const dept_id = req.session.dept_id;

  if (!usns || !Array.isArray(usns) || usns.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const trx = await db.transaction();
  try {
    await trx('global_directory').whereIn('user_id', usns).andWhere({ role: 'student', dept_id }).del();
    await trx('global_students').whereIn('usn', usns).andWhere({ dept_id }).del();
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'DELETE', 'STUDENT', `Bulk deleted ${usns.length} students`);
    }
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
