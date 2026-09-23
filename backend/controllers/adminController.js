const db = require('../config/db');
const { logActivity } = require('../utils/logger');
const bcrypt = require('bcrypt');

const getGlobalMetrics = async (req, res) => {
  try {
    const [
      studentsCount,
      facultyCount,
      activeSessionsCount,
      feedbackStats,
      completedCount,
      totalAssignedCount
    ] = await Promise.all([
      db('global_students').count('* as c').first(),
      db('global_faculty').count('* as c').first(),
      db('global_sessions').where({ status: 'active' }).count('* as c').first(),
      db('global_student_feedback').avg('rating as a').count('* as c').first(),
      db('global_students').where({ feedback_given: 'done' }).count('* as c').first(),
      db('global_students').whereNotNull('session_id').count('* as c').first()
    ]);

    const totalStudents = studentsCount?.c || 0;
    const totalFaculty = facultyCount?.c || 0;
    const activeSessions = activeSessionsCount?.c || 0;
    const globalRating = feedbackStats?.a ? parseFloat(feedbackStats.a).toFixed(2) : "0.00";
    const completed = completedCount?.c || 0;
    const total = totalAssignedCount?.c || 0;
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";

    res.json({
      totalStudents,
      totalFaculty,
      activeSessions,
      globalRating,
      completionRate
    });
  } catch (err) {
    console.error("Error fetching global metrics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getGlobalFaculties = async (req, res) => {
  try {
    const rows = await db('global_faculty as f')
      .join('department as d', 'f.dept_id', 'd.dept_id')
      .select(
        'f.faculty_id', 'f.name', 'f.email', 'f.position', 'f.dob', 'f.joining_date', 'f.dept_id', 'd.dept_name',
        db.raw(`(SELECT AVG(rating) FROM global_student_feedback sf WHERE sf.faculty_id = f.faculty_id AND sf.dept_id = f.dept_id) as avg_rating`)
      );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getGlobalStudents = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const sem = req.query.sem ? parseInt(req.query.sem, 10) : null;
    const dept_id = req.query.dept_id ? String(req.query.dept_id).trim().toUpperCase() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;

    let baseQuery = db('global_students as s')
      .join('department as d', 's.dept_id', 'd.dept_id');

    if (dept_id) baseQuery = baseQuery.where('s.dept_id', dept_id);
    if (sem) baseQuery = baseQuery.where('s.sem', sem);
    if (search) {
      baseQuery = baseQuery.where(function() {
        this.where('s.usn', 'like', `%${search}%`).orWhere('s.name', 'like', `%${search}%`);
      });
    }

    if (page && limit) {
      const offset = (page - 1) * limit;
      const countRes = await baseQuery.clone().count('* as count').first();
      const rows = await baseQuery
        .clone()
        .select('s.usn', 's.name', 's.sem', 's.section', 's.dept_id', 'd.dept_name')
        .orderBy(['s.sem', 's.usn'])
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

    const rows = await baseQuery
      .select('s.usn', 's.name', 's.sem', 's.section', 's.dept_id', 'd.dept_name')
      .orderBy(['s.sem', 's.usn']);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching global students:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getGlobalSessions = async (req, res) => {
  try {
    const rows = await db('global_sessions as s')
      .join('department as d', 's.dept_id', 'd.dept_id')
      .select('s.session_id', 's.sem', 's.section', 's.status', 's.created_at', 's.dept_id', 'd.dept_name')
      .orderBy('s.created_at', 'desc');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getDepartmentSummaries = async (req, res) => {
  try {
    const [
      departments,
      studentCounts,
      facultyCounts,
      sessionCounts,
      ratingStats
    ] = await Promise.all([
      db('department').select('dept_id', 'dept_name', 'is_active'),
      db('global_students').select('dept_id').count('* as count').groupBy('dept_id'),
      db('global_faculty').select('dept_id').count('* as count').groupBy('dept_id'),
      db('global_sessions').where({ status: 'active' }).select('dept_id').count('* as count').groupBy('dept_id'),
      db('global_student_feedback').select('dept_id').avg('rating as avg_rating').groupBy('dept_id')
    ]);

    const studentMap = Object.fromEntries(studentCounts.map(r => [r.dept_id, r.count]));
    const facultyMap = Object.fromEntries(facultyCounts.map(r => [r.dept_id, r.count]));
    const sessionMap = Object.fromEntries(sessionCounts.map(r => [r.dept_id, r.count]));
    const ratingMap = Object.fromEntries(ratingStats.map(r => [r.dept_id, r.avg_rating]));

    const summaries = departments.map((d) => ({
      ...d,
      student_count: studentMap[d.dept_id] || 0,
      faculty_count: facultyMap[d.dept_id] || 0,
      active_sessions: sessionMap[d.dept_id] || 0,
      avg_rating: ratingMap[d.dept_id] ? parseFloat(ratingMap[d.dept_id]).toFixed(2) : 0
    }));

    res.json(summaries);
  } catch (err) {
    console.error("Error fetching department summaries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const toggleDepartmentStatus = async (req, res) => {
  const { dept_id } = req.params;
  const { is_active } = req.body;
  try {
    await db('department').where({ dept_id }).update({ is_active });
    
    await logActivity(req, 'ADMIN', 'UPDATE', 'DEPARTMENT', `Set department ${dept_id} to ${is_active ? 'Active' : 'Inactive'}`);

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error("Status Update Error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

const resetDepartmentFeedback = async (req, res) => {
  const { dept_id } = req.params;
  const trx = await db.transaction();
  try {
    await trx('global_student_feedback').where({ dept_id }).del();
    await trx('global_students').where({ dept_id }).whereNotNull('session_id').update({ feedback_given: 'missing' });

    await trx.commit();
    await logActivity(req, dept_id, 'DELETE', 'SESSION', `Wiped all feedback data for department ${dept_id}`);
    
    res.json({ message: "Department feedback data successfully reset." });
  } catch (err) {
    await trx.rollback();
    console.error("Feedback Reset Error:", err);
    res.status(500).json({ error: "Failed to reset feedback data." });
  }
};

const resetDepartmentFaculty = async (req, res) => {
  const { dept_id } = req.params;
  const trx = await db.transaction();
  try {
    await trx('global_student_feedback').where({ dept_id }).del();
    await trx('global_assign').where({ dept_id }).del();
    await trx('global_faculty_notes').where({ dept_id }).del();
    await trx('global_faculty').where({ dept_id }).del();
    await trx('global_directory').where({ role: 'faculty', dept_id }).del();
    await trx('global_pending_faculty_registrations').where({ dept_id }).del();

    await trx.commit();
    await logActivity(req, dept_id, 'DELETE', 'FACULTY', `Wiped all faculty data for department ${dept_id}`);
    
    res.json({ message: "Department faculty data successfully reset." });
  } catch (err) {
    await trx.rollback();
    console.error("Faculty Reset Error:", err);
    res.status(500).json({ error: "Failed to reset faculty data." });
  }
};

const getDepartmentLogs = async (req, res) => {
  const { dept_id } = req.params;
  try {
    const logs = await db('global_department_activity_logs')
      .where({ dept_id })
      .select('*', db.raw("DATE_FORMAT(created_at, '%b %d, %Y %I:%i %p') AS formatted_date"))
      .orderBy('log_id', 'desc')
      .limit(50);
    res.json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

const changeDepartmentPassword = async (req, res) => {
  const { dept_id } = req.params;
  const { currentPassword, newPassword } = req.body;
  const { role, dept_id: session_dept_id } = req.session;

  if (role !== 'admin' && session_dept_id !== dept_id) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  try {
    const department = await db('department').where({ dept_id }).first();
    if (!department) return res.status(404).json({ error: "Department not found" });

    // If department, require current password verification
    if (role === 'department') {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required." });
      const isMatch = await bcrypt.compare(currentPassword, department.password);
      if (!isMatch) return res.status(401).json({ error: "Incorrect current password." });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await db('department').where({ dept_id }).update({ password: hash });
    
    // Log activity
    if (role === 'department') {
       await logActivity(req, dept_id, 'UPDATE', 'SECURITY', "Department password was changed.");
    } else {
       await logActivity(req, dept_id, 'UPDATE', 'SECURITY', "Password was reset by System Admin.");
    }

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const purgeDepartmentData = async (req, res) => {
  const { dept_id } = req.params;
  const { purgeStudents, purgeFaculty, purgeSessions, purgeEntireDepartment } = req.body;
  
  const trx = await db.transaction();
  try {
    if (purgeEntireDepartment) {
      // Must delete in correct order to avoid foreign key constraints (if any)
      await trx('global_student_feedback').where({ dept_id }).del();
      await trx('global_assign').where({ dept_id }).del();
      await trx('global_faculty_notes').where({ dept_id }).del();
      await trx('global_students').where({ dept_id }).del();
      await trx('global_sessions').where({ dept_id }).del();
      await trx('global_faculty').where({ dept_id }).del();
      await trx('global_directory').where({ dept_id }).del();
      await trx('global_department_activity_logs').where({ dept_id }).del();
      await trx('global_session_remarks').where({ dept_id }).del();
      await trx('global_course').where({ dept_id }).del();
      await trx('global_pending_faculty_registrations').where({ dept_id }).del();
      await trx('department').where({ dept_id }).del();
    } else {
      if (purgeSessions) {
        await trx('global_student_feedback').where({ dept_id }).del();
        await trx('global_session_remarks').where({ dept_id }).del();
        await trx('global_sessions').where({ dept_id }).del();
        await trx('global_students').where({ dept_id }).update({ session_id: null, feedback_given: 'missing' });
      }
      if (purgeFaculty) {
        await trx('global_student_feedback').where({ dept_id }).del();
        await trx('global_assign').where({ dept_id }).del();
        await trx('global_faculty_notes').where({ dept_id }).del();
        await trx('global_faculty').where({ dept_id }).del();
        await trx('global_directory').where({ role: 'faculty', dept_id }).del();
        await trx('global_pending_faculty_registrations').where({ dept_id }).del();
      }
      if (purgeStudents) {
        await trx('global_student_feedback').where({ dept_id }).del();
        await trx('global_students').where({ dept_id }).del();
        await trx('global_directory').where({ role: 'student', dept_id }).del();
      }
    }
    
    await trx.commit();
    await logActivity(req, 'ADMIN', 'DELETE', 'PURGE', `Purged data for department ${dept_id}`);
    res.json({ message: "Purge successful" });
  } catch (err) {
    await trx.rollback();
    console.error("Purge Error:", err);
    res.status(500).json({ error: "Failed to purge data." });
  }
};

const updateAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.session?.username || 'admin';
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: "Both current and new password are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
  }
  try {
    const admin = await db('admin').where({ username }).first();
    if (!admin) return res.status(404).json({ success: false, error: "Admin account not found" });

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) return res.status(400).json({ success: false, error: "Incorrect current password." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('admin').where({ id: admin.id }).update({ password: hashedPassword });
    await logActivity(req, 'ADMIN', 'UPDATE', 'AUTH', 'Admin password changed');

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Admin update password error:", err);
    res.status(500).json({ success: false, error: "Failed to update password" });
  }
};

const updateAdminUsername = async (req, res) => {
  const { newUsername } = req.body;
  const currentUsername = req.session?.username || 'admin';
  if (!newUsername || !newUsername.trim()) {
    return res.status(400).json({ success: false, error: "New username is required." });
  }
  try {
    const existing = await db('admin').where({ username: newUsername.trim() }).first();
    if (existing) return res.status(400).json({ success: false, error: "Username already taken." });

    await db('admin').where({ username: currentUsername }).update({ username: newUsername.trim() });
    if (req.session) req.session.username = newUsername.trim();
    await logActivity(req, 'ADMIN', 'UPDATE', 'AUTH', `Admin username changed to ${newUsername.trim()}`);

    res.json({ success: true, message: "Username updated successfully" });
  } catch (err) {
    console.error("Admin update username error:", err);
    res.status(500).json({ success: false, error: "Failed to update username" });
  }
};

const getAdminAuditLogs = async (req, res) => {
  try {
    const logs = await db('global_department_activity_logs')
      .select(
        'log_id',
        'created_at as timestamp',
        'entity as module',
        'dept_id as user_name',
        'action_type as action',
        'description as details',
        db.raw("'success' as status")
      )
      .orderBy('log_id', 'desc')
      .limit(100);

    res.json(logs);
  } catch (err) {
    console.error("Error fetching admin audit logs:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getGlobalMetrics,
  getGlobalFaculties,
  getGlobalStudents,
  getGlobalSessions,
  getDepartmentSummaries,
  toggleDepartmentStatus,
  resetDepartmentFeedback,
  resetDepartmentFaculty,
  getDepartmentLogs,
  changeDepartmentPassword,
  purgeDepartmentData,
  updateAdminPassword,
  updateAdminUsername,
  getAdminAuditLogs
};
