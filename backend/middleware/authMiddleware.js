// authMiddleware.js

const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') next();
  else res.status(401).json({ error: "Unauthorized: Admin access required" });
};

const isDepartment = (req, res, next) => {
  if (!req.session || req.session.role !== 'department') {
    return res.status(401).json({ error: "Unauthorized: Department access required" });
  }
  
  // Strict Horizontal Security Check (Case-Insensitive)
  const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
  if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
    return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
  }
  
  next();
};

const isAdminOrDepartment = (req, res, next) => {
  if (!req.session || !req.session.role) {
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }

  if (req.session.role === 'admin') {
    return next(); // Admins have universal access
  }

  if (req.session.role === 'department') {
    // Strict Horizontal Security Check (Case-Insensitive)
    const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
    if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
      return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
    }
    return next();
  }

  return res.status(401).json({ error: "Unauthorized: Invalid role" });
};

const isFaculty = (req, res, next) => {
  if (!req.session || req.session.role !== 'faculty') {
    return res.status(401).json({ error: "Unauthorized: Faculty access required" });
  }
  
  const targetFaculty = req.params.faculty_id || req.query.faculty_id;
  if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
    return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
  }
  
  next();
};

const isAdminOrFaculty = (req, res, next) => {
  if (!req.session || !req.session.role) {
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }
  if (req.session.role === 'admin') return next();
  if (req.session.role === 'faculty') {
    const targetFaculty = req.params.faculty_id || req.query.faculty_id;
    if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
      return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
    }
    return next();
  }
  return res.status(403).json({ error: "Forbidden: Admin or Faculty access required" });
};

const isAdminOrDepartmentOrFaculty = (req, res, next) => {
  if (!req.session || !req.session.role) {
    return res.status(401).json({ error: "Unauthorized: No active session" });
  }
  if (req.session.role === 'admin') return next();
  if (req.session.role === 'department') {
    const targetDept = req.params.dept_id || req.query.dept || req.query.dept_id || req.body?.dept_id;
    if (targetDept && req.session.dept_id && req.session.dept_id.toUpperCase() !== targetDept.toUpperCase()) {
      return res.status(403).json({ error: "Forbidden: Cross-department access strictly prohibited" });
    }
    return next();
  }
  if (req.session.role === 'faculty') {
    const targetFaculty = req.params.faculty_id || req.query.faculty_id;
    if (targetFaculty && req.session.faculty_id && req.session.faculty_id.toUpperCase() !== targetFaculty.toUpperCase()) {
      return res.status(403).json({ error: "Forbidden: Cannot access other faculty data" });
    }
    return next();
  }
  return res.status(403).json({ error: "Forbidden: Admin, Department, or Faculty access required" });
};

module.exports = {
  isAdmin,
  isDepartment,
  isAdminOrDepartment,
  isFaculty,
  isAdminOrFaculty,
  isAdminOrDepartmentOrFaculty
};
