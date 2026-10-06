const db = require('../config/db');
const bcrypt = require('bcrypt');
const { logActivity } = require('../utils/logger');

const adminLogin = async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Username and password required" });
  username = username.trim();

  try {
    const adminRows = await db('admin').where({ username }).limit(1);
    
    if (adminRows.length > 0) {
      const isMatch = await bcrypt.compare(password, adminRows[0].password);
      if (isMatch) { 
        req.session.role = 'admin';
        req.session.username = username;
        req.session.name = 'Administrator';
        await logActivity(req, 'ADMIN', 'LOGIN', 'AUTH', `System Administrator (${username}) logged in`, 'SUCCESS');
        return res.json({ success: true, message: "Login successful" });
      }
    }
    await logActivity(req, 'ADMIN', 'FAILED_LOGIN', 'SECURITY', `Failed admin login attempt for user: ${username}`, 'FAILED');
    res.json({ success: false, message: "Invalid username or password" });
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const departmentLogin = async (req, res) => {
  let { username, password } = req.body;
  if (username) username = username.trim().toLowerCase();
  
  const deptRows = await db('department').where({ username }).limit(1);
  
  if (deptRows.length > 0) {
    if (deptRows[0].is_active === 0) {
      await logActivity(req, deptRows[0].dept_id, 'BLOCKED_LOGIN', 'SECURITY', `Suspended department account (${deptRows[0].dept_id}) attempted login`, 'WARNING');
      return res.json({ success: false, message: "Your department account has been suspended by the Admin." });
    }
    const isMatch = await bcrypt.compare(password, deptRows[0].password);
    if (isMatch) { 
      req.session.role = 'department';
      req.session.dept_id = deptRows[0].dept_id;
      req.session.dept_name = deptRows[0].dept_name;
      req.session.name = deptRows[0].dept_name;
      req.session.logo_url = deptRows[0].logo_url;
      req.session.brand_color = deptRows[0].brand_color;
      req.session.brand_accent = deptRows[0].brand_accent;
      req.session.logo_lqip = deptRows[0].logo_lqip;
      
      await logActivity(req, deptRows[0].dept_id, 'LOGIN', 'AUTH', 'Logged into the system', 'SUCCESS');
      
      return res.json({ 
        success: true, 
        message: "Login successful", 
        dept_id: deptRows[0].dept_id, 
        dept_name: deptRows[0].dept_name,
        logo_url: deptRows[0].logo_url,
        brand_color: deptRows[0].brand_color,
        brand_accent: deptRows[0].brand_accent,
        logo_lqip: deptRows[0].logo_lqip
      });
    }
  }
  await logActivity(req, username ? username.toUpperCase() : 'UNKNOWN', 'FAILED_LOGIN', 'SECURITY', `Failed department login attempt for username: ${username}`, 'FAILED');
  res.json({ success: false, message: "Invalid username or password" });
};

const facultyLogin = async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: "Email/ID and password are required" });
  const searchInput = email.trim().toLowerCase();

  try {
    // Search global_faculty first by email OR faculty_id (case insensitive)
    const faculty = await db('global_faculty')
      .whereRaw('LOWER(email) = ? OR LOWER(faculty_id) = ?', [searchInput, searchInput])
      .first();

    if (!faculty) {
      // Check if registration is pending approval
      const pending = await db('global_pending_faculty_registrations')
        .whereRaw('LOWER(email) = ? OR LOWER(faculty_id) = ?', [searchInput, searchInput])
        .first();

      if (pending) {
        return res.json({ success: false, message: "Your registration is currently pending HOD / Admin approval." });
      }

      await logActivity(req, 'FACULTY', 'FAILED_LOGIN', 'SECURITY', `Failed faculty login attempt for: ${searchInput}`, 'FAILED');
      return res.json({ success: false, message: "Invalid email/ID or password" });
    }

    if (faculty.is_active === 0) {
      await logActivity(req, faculty.dept_id, 'BLOCKED_LOGIN', 'SECURITY', `Disabled faculty account (${searchInput}) attempted login`, 'WARNING');
      return res.json({ success: false, message: "Account disabled by Admin" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (isMatch) {
      const deptIdUpper = (faculty.dept_id || '').toUpperCase();
      req.session.role = 'faculty';
      req.session.dept_id = deptIdUpper;
      req.session.faculty_id = faculty.faculty_id;
      req.session.name = faculty.name;

      await logActivity(req, deptIdUpper, 'LOGIN', 'AUTH', `Faculty member ${faculty.name} (${faculty.faculty_id}) logged in`, 'SUCCESS');
      return res.json({ 
        success: true, 
        message: "Login successful", 
        faculty: { 
          faculty_id: faculty.faculty_id, 
          name: faculty.name, 
          dept_id: deptIdUpper 
        } 
      });
    }

    await logActivity(req, faculty.dept_id || 'FACULTY', 'FAILED_LOGIN', 'SECURITY', `Failed faculty login attempt for: ${searchInput}`, 'FAILED');
    res.json({ success: false, message: "Invalid email/ID or password" });
  } catch (err) {
    console.error("Faculty Login Error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
};

const studentLogin = async (req, res) => {
  let { usn, session_id } = req.body;
  if (!usn || !session_id)
    return res.status(400).json({ message: "USN and session ID are required" });

  usn = String(usn).trim().toUpperCase();
  session_id = String(session_id).trim();

  try {
    // 1. Look up in global_directory
    let dirRows = await db('global_directory').where({ user_id: usn, role: 'student' }).select('dept_id').limit(1);
    let dept_id = dirRows.length > 0 ? dirRows[0].dept_id : null;
    
    // Fallback / self-heal: Check global_students directly if not found in directory
    if (!dept_id) {
      const directStudent = await db('global_students').whereRaw('UPPER(TRIM(usn)) = ?', [usn]).first();
      if (directStudent) {
        dept_id = directStudent.dept_id;
        await db('global_directory')
          .insert({ user_id: usn, role: 'student', dept_id })
          .onConflict('user_id')
          .merge({ dept_id, role: 'student' });
      } else {
        return res.status(404).json({ message: "Student USN not found" });
      }
    }
    
    const students = await db('global_students').where({ usn, dept_id }).limit(1);
    if (students.length === 0) {
      return res.status(404).json({ message: "Student USN not found in department" });
    }
    
    const depts = await db('department').where({ dept_id }).select('is_active').limit(1);
    if (depts.length > 0 && depts[0].is_active === 0) {
      return res.status(403).json({ message: "Your department account has been suspended by the Admin." });
    }
    
    const sessions = await db('global_sessions').where({ session_id, dept_id }).limit(1);
    if (sessions.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    const session = sessions[0];
    if (session.status !== 'active') {
      return res.status(403).json({ message: "This feedback session is not active" });
    }

    // Robust comparison of sem and section (type-safe & case-insensitive)
    const studentSem = parseInt(students[0].sem, 10);
    const sessionSem = parseInt(session.sem, 10);
    const studentSec = String(students[0].section || '').trim().toUpperCase();
    const sessionSec = String(session.section || '').trim().toUpperCase();

    if (studentSem !== sessionSem || studentSec !== sessionSec) {
      return res.status(403).json({ 
        message: `Access denied. This session is for Sem ${session.sem} Sec ${session.section}, but you are registered in Sem ${students[0].sem} Sec ${students[0].section}.` 
      });
    }
    
    // Bind student to current active session and mark as pending if not already completed for THIS session
    const isAlreadyDoneThisSession = (students[0].session_id === session_id && students[0].feedback_given === 'done');
    await db('global_students')
      .where({ usn, dept_id })
      .update({
        session_id,
        feedback_given: isAlreadyDoneThisSession ? 'done' : 'pending'
      });
    
    req.session.role = 'student';
    req.session.dept_id = dept_id;
    req.session.usn = usn;
    req.session.session_id = session_id;
    req.session.name = students[0].name;
    req.session.sem = students[0].sem;
    req.session.section = students[0].section;
    
    res.json({ 
      success: true, 
      message: "Login successful", 
      student: { usn, name: students[0].name, dept_id },
      session: { session_id, sem: session.sem, section: session.section } 
    });
  } catch (err) {
    console.error("Student Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const logout = async (req, res) => {
  const actor = req.session?.dept_id || (req.session?.role === 'admin' ? 'ADMIN' : (req.session?.faculty_id ? `FACULTY-${req.session.faculty_id}` : null));
  const roleName = req.session?.role ? req.session.role.toUpperCase() : 'USER';
  
  if (actor) {
    await logActivity(req, actor, 'LOGOUT', 'AUTH', `${roleName} logged out of the system`, 'SUCCESS');
  }

  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: "Logged out" });
  });
};

const silentLogout = async (req, res) => {
  const actor = req.session?.dept_id || (req.session?.role === 'admin' ? 'ADMIN' : (req.session?.faculty_id ? `FACULTY-${req.session.faculty_id}` : null));
  const roleName = req.session?.role ? req.session.role.toUpperCase() : 'USER';
  
  if (actor) {
    await logActivity(req, actor, 'LOGOUT', 'AUTH', `${roleName} logged out (Browser Tab Closed)`, 'SUCCESS');
  }

  req.session.destroy(err => {
    res.clearCookie('connect.sid');
    res.end();
  });
};

const checkSession = async (req, res) => {
  if (req.session && req.session.role) {
    let dept_name = req.session.dept_name;
    let logo_url = req.session.logo_url;
    let brand_color = req.session.brand_color;
    let brand_accent = req.session.brand_accent;
    let logo_lqip = req.session.logo_lqip;
    
    // Auto-fill or refresh dept details for active sessions
    if (req.session.dept_id) {
      try {
        const d = await db('department')
          .where({ dept_id: req.session.dept_id })
          .select('dept_name', 'logo_url', 'brand_color', 'brand_accent', 'logo_lqip')
          .first();
        if (d) {
          dept_name = d.dept_name;
          logo_url = d.logo_url;
          brand_color = d.brand_color;
          brand_accent = d.brand_accent;
          logo_lqip = d.logo_lqip;

          req.session.dept_name = dept_name;
          req.session.logo_url = logo_url;
          req.session.brand_color = brand_color;
          req.session.brand_accent = brand_accent;
          req.session.logo_lqip = logo_lqip;
        } else if (req.session.role === 'department') {
          // Department was completely removed from the database!
          return req.session.destroy(() => {
            res.json({ success: false, message: "Department no longer exists. Please log in again." });
          });
        }
      } catch (e) {
        console.error("Failed to fetch dept details for session:", e);
        dept_name = "Unknown Department";
      }
    }

    res.json({
      success: true,
      user: {
        role: req.session.role,
        username: req.session.username,
        name: req.session.name,
        dept_id: req.session.dept_id,
        dept_name: dept_name || req.session.dept_id,
        faculty_id: req.session.faculty_id,
        usn: req.session.usn,
        sem: req.session.sem,
        section: req.session.section,
        logo_url,
        brand_color: brand_color || '#2563EB',
        brand_accent: brand_accent || '#1E40AF',
        logo_lqip
      }
    });
  } else {
    res.json({ success: false, message: "No active session" });
  }
};

module.exports = {
  adminLogin,
  departmentLogin,
  facultyLogin,
  studentLogin,
  logout,
  silentLogout,
  checkSession
};
