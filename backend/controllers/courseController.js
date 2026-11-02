const db = require('../config/db');
const { logActivity } = require('../utils/logger');

//=========================================================
// Get courses by department
//=========================================================
const getCoursesByDept = async (req, res) => {
  let { dept_id } = req.params;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const rows = await db('global_course')
      .where({ dept_id, is_active: true })
      .select('course_id', 'course_name', 'course_code', 'sem');
    res.json(rows);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ error: "Database error" });
  }
};

//=========================================================
// Update Course
//=========================================================
const updateCourse = async (req, res) => {
  const { course_code } = req.params;
  const { course_name, sem } = req.body;
  let dept_id = req.session?.dept_id || req.body?.dept_id || req.query?.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const q = db('global_course').where({ course_code });
    if (dept_id) q.andWhere({ dept_id });
    await q.update({ course_name, sem });
    res.json({ success: true, message: "Course updated" });
  } catch (err) {
    console.error("UPDATE COURSE ERR:", err);
    res.status(500).json({ success: false, message: "Error updating course", error: err.message });
  }
};

//=========================================================
// Deactivate Course
//=========================================================
const deleteCourse = async (req, res) => {
  const { course_code } = req.params;
  let dept_id = req.session?.dept_id || req.body?.dept_id || req.query?.dept_id;
  if (dept_id) dept_id = dept_id.toUpperCase();
  try {
    const q = db('global_course').where({ course_code });
    if (dept_id) q.andWhere({ dept_id });
    await q.update({ is_active: false });
    res.json({ success: true, message: "Course deactivated" });
  } catch (err) {
    console.error("DELETE COURSE ERR:", err);
    res.status(500).json({ success: false, message: "Error deactivating course", error: err.message });
  }
};

//=========================================================
// Bulk Upload Courses
//=========================================================
const bulkUploadCourses = async (req, res) => {
  const { dept_id, courses } = req.body;
  if (!dept_id || !courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const cleanDeptId = String(dept_id).trim().toUpperCase();
  if (req.session?.role === 'department' && req.session.dept_id && req.session.dept_id.toUpperCase() !== cleanDeptId) {
    return res.status(403).json({ error: "Unauthorized: Cannot bulk upload courses for another department." });
  }

  if (courses.length > 1000) {
    return res.status(400).json({ error: "Batch size exceeds maximum limit of 1000 records per upload." });
  }

  const trx = await db.transaction();
  try {
    let insertedCount = 0;
    for (const c of courses) {
      if (!c.course_code || !c.course_name) continue;
      const cleanCourseCode = String(c.course_code).trim().toUpperCase();
      const cleanCourseName = String(c.course_name).trim();
      const cleanSem = !isNaN(parseInt(c.sem, 10)) ? parseInt(c.sem, 10) : null;

      const existing = await trx('global_course').where({ course_code: cleanCourseCode, dept_id: cleanDeptId }).first();
      if (!existing) {
        await trx('global_course').insert({
          course_code: cleanCourseCode,
          dept_id: cleanDeptId,
          course_name: cleanCourseName,
          sem: cleanSem,
          is_active: true
        });
        insertedCount++;
      }
    }
    
    if (req.session?.role === 'department') {
      await logActivity(req, dept_id, 'UPLOAD', 'COURSE', `Bulk uploaded ${insertedCount} subjects`);
    }

    await trx.commit();
    res.json({ message: "Bulk upload successful", inserted: insertedCount });
  } catch (err) {
    await trx.rollback();
    console.error("Bulk Course Upload Error:", err);
    res.status(500).json({ error: "Failed to upload courses", details: err.message });
  }
};

module.exports = {
  getCoursesByDept,
  updateCourse,
  deleteCourse,
  bulkUploadCourses
};
