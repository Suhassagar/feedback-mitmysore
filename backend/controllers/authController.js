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
        return res.json({ success: true, message: "Login successful" });
      }
    }
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
      return res.json({ success: false, message: "Your department account has been suspended by the Admin." });
    }
    const isMatch = await bcrypt.compare(password, deptRows[0].password);
    if (isMatch) { 
      req.session.role = 'department';
      req.session.dept_id = deptRows[0].dept_id;
      req.session.dept_name = deptRows[0].dept_name;
      req.session.name = deptRows[0].dept_name;
      
      await logActivity(req, deptRows[0].dept_id, 'LOGIN', 'AUTH', 'Logged into the system');
      
      return res.json({ success: true, message: "Login successful", dept_id: deptRows[0].dept_id, dept_name: deptRows[0].dept_name });
    }
  }
  res.json({ success: false, message: "Invalid username or password" });
};

const facultyLogin = async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, message: "Email and password are required" });
  email = email.trim().toLowerCase();
  try {
    const dirRows = await db('global_directory').where({ user_id: email, role: 'faculty' }).select('dept_id').limit(1);
    if (dirRows.length === 0) return res.json({ success: false, message: "Invalid email or password" });
    
    const dept_id = dirRows[0].dept_id;
    const facultyRows = await db('global_faculty').where({ email, dept_id }).limit(1);
    
    if (facultyRows.length > 0) {
      if (facultyRows[0].is_active === 0) {
        return res.json({ success: false, message: "Account disabled by Admin" });
      }
      
      const isMatch = await bcrypt.compare(password, facultyRows[0].password);
      if (isMatch) {
        req.session.role = 'faculty';
        req.session.dept_id = dept_id;
        req.session.faculty_id = facultyRows[0].faculty_id;
        req.session.name = facultyRows[0].name;
        return res.json({ success: true, message: "Login successful", faculty: { faculty_id: facultyRows[0].faculty_id, name: facultyRows[0].name, dept_id } });
      }
    }
    res.json({ success: false, message: "Invalid email or password" });
  } catch (err) {
    console.error("Faculty Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const studentLogin = async (req, res) => {
  let { usn, session_id } = req.body;
  if (!usn || !session_id)
    return res.status(400).json({ message: "USN and session ID are required" });

  usn = usn.trim().toUpperCase();
  session_id = session_id.trim();

  try {
    const dirRows = await db('global_directory').where({ user_id: usn, role: 'student' }).select('dept_id').limit(1);
    if (dirRows.length === 0) return res.status(404).json({ message: "Student USN not found" });
    
    const dept_id = dirRows[0].dept_id;
    
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

    if (students[0].sem !== session.sem || students[0].section !== session.section) {
      return res.status(403).json({ 
        message: `Access denied. This session is for Sem ${session.sem} Sec ${session.section}, but you are registered in Sem ${students[0].sem} Sec ${students[0].section}.` 
      });
    }
    
    // Bind student to current active session and mark as pending if not done
    await db('global_students')
      .where({ usn, dept_id })
      .update({
        session_id,
        feedback_given: db.raw("CASE WHEN feedback_given = 'done' THEN 'done' ELSE 'pending' END")
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
  const dept_id = req.session?.dept_id;
  
  if (dept_id) {
    await logActivity(req, dept_id, 'LOGOUT', 'AUTH', 'Logged out of the system');
  }

  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid');
    res.json({ success: true, message: "Logged out" });
  });
};

const silentLogout = async (req, res) => {
  const dept_id = req.session?.dept_id;
  
  if (dept_id) {
    await logActivity(req, dept_id, 'LOGOUT', 'AUTH', 'Logged out (Browser Tab Closed)');
  }

  req.session.destroy(err => {
    res.clearCookie('connect.sid');
    res.end();
  });
};

const checkSession = async (req, res) => {
  if (req.session && req.session.role) {
    let dept_name = req.session.dept_name;
    
    // Auto-fill dept_name for existing active sessions
    if (!dept_name && req.session.dept_id) {
      try {
        const d = await db('department').where({ dept_id: req.session.dept_id }).select('dept_name').first();
        if (d) {
          dept_name = d.dept_name;
          req.session.dept_name = dept_name;
        } else {
          // Department was completely removed from the database!
          return req.session.destroy(() => {
            res.json({ success: false, message: "Department no longer exists. Please log in again." });
          });
        }
      } catch (e) {
        console.error("Failed to fetch dept_name for session:", e);
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
        section: req.session.section
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
