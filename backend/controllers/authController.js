const db = require('../config/db');
const bcrypt = require('bcrypt');
const { logActivity, logSecurityAlert } = require('../utils/logger');

const adminLogin = async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: "Username and password required" });
  username = username.trim();

  try {
    const adminRows = await db('admin').where({ username }).limit(1);
    
    if (adminRows.length > 0) {
      const isMatch = await bcrypt.compare(password, adminRows[0].password);
      if (isMatch) { 
        return req.session.regenerate(async (regenErr) => {
          if (regenErr) {
            console.error("Session regeneration error:", regenErr);
            return res.status(500).json({ success: false, message: "Session initialization error" });
          }
          req.session.role = 'admin';
          req.session.username = username;
          req.session.name = 'Administrator';
          await logActivity(req, 'ADMIN', 'LOGIN', 'AUTH', `System Administrator (${username}) logged in`, 'SUCCESS');
          return res.json({ success: true, message: "Login successful" });
        });
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
      return req.session.regenerate(async (regenErr) => {
        if (regenErr) {
          console.error("Session regeneration error:", regenErr);
          return res.status(500).json({ success: false, message: "Session initialization error" });
        }
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
      await logActivity(req, 'SECURITY', 'BLOCKED_LOGIN', 'SECURITY', `Disabled faculty account (${searchInput}) attempted login`, 'WARNING');
      return res.json({ success: false, message: "Account disabled by Admin" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (isMatch) {
      const isDefaultPwd = (password === "Fac@2007") || Boolean(faculty.must_change_password);
      const deptIdUpper = (faculty.dept_id || '').toUpperCase();

      return req.session.regenerate(async (regenErr) => {
        if (regenErr) {
          console.error("Session regeneration error:", regenErr);
          return res.status(500).json({ success: false, message: "Session error during login" });
        }

        req.session.role = 'faculty';
        req.session.dept_id = deptIdUpper;
        req.session.faculty_id = faculty.faculty_id;
        req.session.name = faculty.name;
        req.session.must_change_password = isDefaultPwd;

        // Note: Faculty login events are not recorded or saved in department logs
        return res.json({ 
          success: true, 
          message: "Login successful", 
          must_change_password: isDefaultPwd,
          faculty: { 
            faculty_id: faculty.faculty_id, 
            name: faculty.name, 
            dept_id: deptIdUpper,
            must_change_password: isDefaultPwd
          } 
        });
      });
    }

    await logActivity(req, 'SECURITY', 'FAILED_LOGIN', 'SECURITY', `Failed faculty login attempt for: ${searchInput}`, 'FAILED');
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
        await logSecurityAlert(req, 'SECURITY', 'FAILED_LOGIN', `Student login failed: USN ${usn} not found`, 'FAILED');
        return res.status(404).json({ message: "Student USN not found" });
      }
    }
    
    const students = await db('global_students').where({ usn, dept_id }).limit(1);
    if (students.length === 0) {
      await logSecurityAlert(req, 'SECURITY', 'FAILED_LOGIN', `Student login failed: USN ${usn} not found in department ${dept_id}`, 'FAILED');
      return res.status(404).json({ message: "Student USN not found in department" });
    }
    
    const depts = await db('department').where({ dept_id }).select('is_active').limit(1);
    if (depts.length > 0 && depts[0].is_active === 0) {
      await logSecurityAlert(req, 'SECURITY', 'SUSPENDED_DEPT_ACCESS', `Student login attempt for suspended department ${dept_id} by USN ${usn}`, 'FAILED');
      return res.status(403).json({ message: "Your department account has been suspended by the Admin." });
    }
    
    const sessions = await db('global_sessions').where({ session_id, dept_id }).limit(1);
    if (sessions.length === 0) {
      await logSecurityAlert(req, 'SECURITY', 'FAILED_LOGIN', `Student login failed: Session ${session_id} not found for department ${dept_id}`, 'FAILED');
      return res.status(404).json({ message: "Session not found" });
    }
    
    const session = sessions[0];
    if (session.status !== 'active') {
      await logSecurityAlert(req, 'SECURITY', 'INACTIVE_SESSION_ACCESS', `Student login attempt to inactive session ${session_id} by USN ${usn}`, 'FAILED');
      return res.status(403).json({ message: "This feedback session is not active" });
    }

    // Robust comparison of sem and section (type-safe & case-insensitive)
    const studentSem = parseInt(students[0].sem, 10);
    const sessionSem = parseInt(session.sem, 10);
    const studentSec = String(students[0].section || '').trim().toUpperCase();
    const sessionSec = String(session.section || '').trim().toUpperCase();

    if (studentSem !== sessionSem || studentSec !== sessionSec) {
      await logSecurityAlert(req, 'SECURITY', 'SECTION_MISMATCH_ACCESS', `Student ${usn} (Sem ${studentSem} Sec ${studentSec}) attempted access to session ${session_id} (Sem ${sessionSem} Sec ${sessionSec})`, 'FAILED');
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
    
    return req.session.regenerate(async (regenErr) => {
      if (regenErr) {
        console.error("Session regeneration error:", regenErr);
        return res.status(500).json({ success: false, message: "Session initialization error" });
      }

      req.session.role = 'student';
      req.session.dept_id = dept_id;
      req.session.usn = usn;
      req.session.session_id = session_id;
      req.session.name = students[0].name;
      req.session.sem = students[0].sem;
      req.session.section = students[0].section;

      // Note: Student login events are not recorded or saved in department logs
      return res.json({ 
        success: true, 
        message: "Login successful", 
        student: { usn, name: students[0].name, dept_id },
        session: { session_id, sem: session.sem, section: session.section } 
      });
    });
  } catch (err) {
    console.error("Student Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const logout = async (req, res) => {
  const { role, dept_id, username } = req.session || {};
  
  // Only record audit log for Admin and Department accounts (student and faculty logouts are not recorded)
  if (role === 'admin') {
    await logActivity(req, 'ADMIN', 'LOGOUT', 'AUTH', `System Administrator (${username || 'admin'}) logged out`, 'SUCCESS');
  } else if (role === 'department' && dept_id) {
    await logActivity(req, dept_id, 'LOGOUT', 'AUTH', `Department (${dept_id}) logged out of the system`, 'SUCCESS');
  }

  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: "Logged out" });
  });
};

const silentLogout = async (req, res) => {
  const { role, dept_id, username } = req.session || {};
  
  if (role === 'admin') {
    await logActivity(req, 'ADMIN', 'LOGOUT', 'AUTH', `System Administrator (${username || 'admin'}) logged out (Browser Tab Closed)`, 'SUCCESS');
  } else if (role === 'department' && dept_id) {
    await logActivity(req, dept_id, 'LOGOUT', 'AUTH', `Department (${dept_id}) logged out (Browser Tab Closed)`, 'SUCCESS');
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
    
    // Auto-fill or refresh dept details for active sessions & check department active status
    if (req.session.dept_id) {
      try {
        const d = await db('department')
          .where({ dept_id: req.session.dept_id })
          .select('dept_name', 'logo_url', 'brand_color', 'brand_accent', 'logo_lqip', 'is_active')
          .first();
        if (d) {
          // Check if department is inactive/suspended
          if (d.is_active === 0 || d.is_active === false) {
            return req.session.destroy(() => {
              res.clearCookie('connect.sid');
              return res.status(403).json({ success: false, message: "Department account has been deactivated. Contact Admin." });
            });
          }

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
            res.clearCookie('connect.sid');
            return res.status(401).json({ success: false, message: "Department no longer exists. Please log in again." });
          });
        }
      } catch (e) {
        console.error("Failed to fetch dept details for session:", e);
        dept_name = "Unknown Department";
      }
    }

    // Verify faculty active status & account existence
    if (req.session.role === 'faculty' && req.session.faculty_id) {
      try {
        const f = await db('global_faculty')
          .where({ faculty_id: req.session.faculty_id })
          .select('is_active')
          .first();
        if (!f) {
          return req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.status(401).json({ success: false, message: "Faculty account no longer exists." });
          });
        }
        if (f.is_active === 0 || f.is_active === false) {
          return req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.status(403).json({ success: false, message: "Your account has been deactivated. Please contact your Department." });
          });
        }
      } catch (e) {
        console.error("Failed to verify faculty status for session:", e);
      }
    }

    // Verify admin account existence
    if (req.session.role === 'admin' && req.session.username) {
      try {
        const a = await db('admin')
          .where({ username: req.session.username })
          .select('id')
          .first();
        if (!a) {
          return req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.status(401).json({ success: false, message: "Admin account no longer exists." });
          });
        }
      } catch (e) {
        console.error("Failed to verify admin status for session:", e);
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
        must_change_password: Boolean(req.session.must_change_password),
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
