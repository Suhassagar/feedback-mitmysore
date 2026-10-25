// authMiddleware.js
const { logSecurityAlert } = require('../utils/logger');

const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') return next();
  logSecurityAlert(req, 'ADMIN', 'UNAUTHORIZED_ACCESS', 'Admin privileges required', 'WARNING');
  return res.status(401).json({ error: "Unauthorized: Admin access required" });
};

const isDepartment = (req, res, next) => {
  if (!req.session || req.session.role !== 'department') {
    logSecurityAlert(req, 'DEPARTMENT', 'UNAUTHORIZED_ACCESS', 'Department privileges required', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: Department access required" });
  }
  
  // Strict Horizontal Security Check (Case-Insensitive)
  const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
  if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
    logSecurityAlert(req, req.session.dept_id, 'CROSS_DEPT_PROBE', `Attempted cross-department access to ${targetDept}`, 'FAILED');
    return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
  }
  
  next();
};

const isAdminOrDepartment = (req, res, next) => {
  if (!req.session || !req.session.role) {
    logSecurityAlert(req, 'SECURITY', 'UNAUTHENTICATED_ACCESS', 'No active session provided', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }

  if (req.session.role === 'admin') {
    return next(); // Admins have universal access
  }

  if (req.session.role === 'department') {
    // Strict Horizontal Security Check (Case-Insensitive)
    const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
    if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
      logSecurityAlert(req, req.session.dept_id, 'CROSS_DEPT_PROBE', `Attempted cross-department access to ${targetDept}`, 'FAILED');
      return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
    }
    return next();
  }

  logSecurityAlert(req, 'SECURITY', 'INVALID_ROLE', `Role ${req.session.role} rejected for admin/department endpoint`, 'WARNING');
  return res.status(401).json({ error: "Unauthorized: Invalid role" });
};

const isFaculty = (req, res, next) => {
  if (!req.session || req.session.role !== 'faculty') {
    logSecurityAlert(req, 'FACULTY', 'UNAUTHORIZED_ACCESS', 'Faculty privileges required', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: Faculty access required" });
  }
  
  const targetFaculty = req.params.faculty_id || req.query.faculty_id;
  if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
    logSecurityAlert(req, req.session.dept_id || 'FACULTY', 'CROSS_FACULTY_PROBE', `Faculty ${req.session.faculty_id} attempted access to ${targetFaculty}`, 'FAILED');
    return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
  }
  
  next();
};

const isAdminOrFaculty = (req, res, next) => {
  if (!req.session || !req.session.role) {
    logSecurityAlert(req, 'SECURITY', 'UNAUTHENTICATED_ACCESS', 'No active session provided', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }
  if (req.session.role === 'admin') return next();
  if (req.session.role === 'faculty') {
    const targetFaculty = req.params.faculty_id || req.query.faculty_id;
    if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
      logSecurityAlert(req, req.session.dept_id || 'FACULTY', 'CROSS_FACULTY_PROBE', `Faculty ${req.session.faculty_id} attempted access to ${targetFaculty}`, 'FAILED');
      return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
    }
    return next();
  }
  logSecurityAlert(req, 'SECURITY', 'INVALID_ROLE', `Role ${req.session.role} rejected for admin/faculty endpoint`, 'WARNING');
  return res.status(403).json({ error: "Forbidden: Admin or Faculty access required" });
};

const isAdminOrDepartmentOrFaculty = (req, res, next) => {
  if (!req.session || !req.session.role) {
    logSecurityAlert(req, 'SECURITY', 'UNAUTHENTICATED_ACCESS', 'No active session provided', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }
  if (req.session.role === 'admin') return next();
  if (req.session.role === 'department') {
    const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
    if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
      logSecurityAlert(req, req.session.dept_id, 'CROSS_DEPT_PROBE', `Attempted cross-department access to ${targetDept}`, 'FAILED');
      return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
    }
    return next();
  }
  if (req.session.role === 'faculty') {
    const targetFaculty = req.params.faculty_id || req.query.faculty_id;
    if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
      logSecurityAlert(req, req.session.dept_id || 'FACULTY', 'CROSS_FACULTY_PROBE', `Faculty ${req.session.faculty_id} attempted access to ${targetFaculty}`, 'FAILED');
      return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
    }
    const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
    if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
      logSecurityAlert(req, req.session.dept_id, 'CROSS_DEPT_PROBE', `Faculty attempted cross-department access to ${targetDept}`, 'FAILED');
      return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
    }
    return next();
  }
  logSecurityAlert(req, 'SECURITY', 'INVALID_ROLE', `Role ${req.session.role} rejected for admin/department/faculty endpoint`, 'WARNING');
  return res.status(403).json({ error: "Forbidden: Admin, Department, or Faculty access required" });
};

const isStudent = (req, res, next) => {
  if (!req.session || req.session.role !== 'student' || !req.session.usn) {
    logSecurityAlert(req, 'STUDENT', 'UNAUTHORIZED_ACCESS', 'Active student session required', 'WARNING');
    return res.status(401).json({ error: "Unauthorized: Active student session required" });
  }

  // Horizontal authorization: Ensure requested session_id matches student's assigned session
  const targetSession = req.params.session_id || req.query.session_id || req.body?.session_id;
  if (targetSession && req.session.session_id && String(req.session.session_id).trim() !== String(targetSession).trim()) {
    logSecurityAlert(req, req.session.dept_id || 'STUDENT', 'CROSS_SESSION_PROBE', `Student ${req.session.usn} attempted access to foreign session ${targetSession}`, 'FAILED');
    return res.status(403).json({ error: "Forbidden: Cannot access data for another feedback session" });
  }

  next();
};

module.exports = {
  isAdmin,
  isDepartment,
  isAdminOrDepartment,
  isFaculty,
  isAdminOrFaculty,
  isAdminOrDepartmentOrFaculty,
  isStudent
};

