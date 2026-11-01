const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { logActivity, logSecurityAlert } = require('../utils/logger');
const { escapeSqlLike } = require('../utils/sanitizer');

const VAULT_SECRET = process.env.SESSION_SECRET || 'mitm-vault-isolated-secret-salt';
const MASTER_VAULT_KEY = process.env.MASTER_VAULT_KEY || 'Mitm@Vault2026!BreakGlass';

/**
 * Ensure system_vault_operators table and initial seeds exist (Runs automatically)
 */
async function ensureVaultOperatorsTable() {
  try {
    const hasTable = await db.schema.hasTable('system_vault_operators');
    if (!hasTable) {
      await db.schema.createTable('system_vault_operators', (table) => {
        table.increments('id').primary();
        table.string('username', 50).unique().notNullable();
        table.string('display_name', 100).notNullable();
        table.string('password', 255).notNullable();
        table.boolean('must_change_password').defaultTo(1);
        table.boolean('is_active').defaultTo(1);
        table.timestamp('last_login_at').nullable();
        table.string('last_login_ip', 95).nullable();
        table.timestamps(true, true);
      });
      console.log('[VAULT] Created system_vault_operators table');
    }

    // Seed suhassagar if not present
    const suhas = await db('system_vault_operators').where({ username: 'suhassagar' }).first();
    if (!suhas) {
      const pwdSuhas = await bcrypt.hash('suhas@6767', 10);
      await db('system_vault_operators').insert({
        username: 'suhassagar',
        display_name: 'Suhas Sagar',
        password: pwdSuhas,
        must_change_password: 1,
        is_active: 1
      });
      console.log('[VAULT] Seeded default operator: suhassagar');
    }

    // Seed santoshe if not present
    const santosh = await db('system_vault_operators').where({ username: 'santoshe' }).first();
    if (!santosh) {
      const pwdSantosh = await bcrypt.hash('santosh@6767', 10);
      await db('system_vault_operators').insert({
        username: 'santoshe',
        display_name: 'Santosh',
        password: pwdSantosh,
        must_change_password: 1,
        is_active: 1
      });
      console.log('[VAULT] Seeded default operator: santoshe');
    }
  } catch (err) {
    console.error('[VAULT INIT ERROR]', err.message);
  }
}

// Auto-run on module load
ensureVaultOperatorsTable();

/**
 * Generate an ephemeral, HMAC-SHA256 signed bearer token (30 min lifetime)
 */
function createVaultToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ 
    ...payload, 
    iat: Date.now(), 
    exp: Date.now() + 30 * 60 * 1000 
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', VAULT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verify signed vault bearer token
 */
function verifyVaultToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', VAULT_SECRET).update(`${header}.${body}`).digest('base64url');
  
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Timing-safe key comparison
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * POST /vault/auth - Triple-Factor Authenticate: Master Key + Username + Personal Password
 */
const authenticateVault = async (req, res) => {
  const { masterKey, username, password } = req.body;

  if (!masterKey || !username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Master Vault Key, Username, and Personal Password are all required.' 
    });
  }

  // 1. Verify Master Key
  const isMasterKeyValid = safeCompare(masterKey.trim(), MASTER_VAULT_KEY.trim());
  if (!isMasterKeyValid) {
    await logSecurityAlert(
      req, 
      'VAULT', 
      'VAULT_AUTH_FAILED', 
      `Invalid Master Key submitted for claimed username "${username}"`, 
      'WARNING'
    );
    return res.status(401).json({ success: false, message: 'Invalid Master Vault Key. Access Denied.' });
  }

  // 2. Query Operator by Username
  const cleanUsername = String(username).trim().toLowerCase();
  const operator = await db('system_vault_operators')
    .whereRaw('LOWER(username) = ?', [cleanUsername])
    .first();

  if (!operator || operator.is_active === 0) {
    await logSecurityAlert(
      req, 
      'VAULT', 
      'VAULT_AUTH_FAILED', 
      `Failed Vault login attempt: Operator username "${cleanUsername}" not found or inactive`, 
      'WARNING'
    );
    return res.status(401).json({ success: false, message: 'Invalid Operator Credentials. Access Denied.' });
  }

  // 3. Verify Personal Password with Bcrypt
  const isPasswordMatch = await bcrypt.compare(password, operator.password);
  if (!isPasswordMatch) {
    await logSecurityAlert(
      req, 
      'VAULT', 
      'VAULT_AUTH_FAILED', 
      `Failed Vault login attempt: Password mismatch for operator "${operator.username}"`, 
      'WARNING'
    );
    return res.status(401).json({ success: false, message: 'Invalid Operator Credentials. Access Denied.' });
  }

  // 4. Update Operator Login Metadata
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
  await db('system_vault_operators').where({ id: operator.id }).update({
    last_login_at: db.fn.now(),
    last_login_ip: String(clientIp).substring(0, 95)
  });

  // 5. Issue 30-min Ephemeral Token
  const tokenPayload = {
    role: 'vault_operator',
    operatorId: operator.id,
    username: operator.username,
    displayName: operator.display_name,
    mustChangePassword: Boolean(operator.must_change_password)
  };

  const token = createVaultToken(tokenPayload);

  // Store in session as well
  if (req.session) {
    req.session.vaultAuth = {
      authenticated: true,
      operatorId: operator.id,
      username: operator.username,
      displayName: operator.display_name,
      mustChangePassword: Boolean(operator.must_change_password),
      unlockedAt: Date.now()
    };
  }

  await logActivity(
    req, 
    'VAULT', 
    'VAULT_UNLOCK', 
    'AUTH', 
    `Master Vault unlocked by Custodian: ${operator.display_name} (@${operator.username})`, 
    'SUCCESS'
  );

  return res.json({
    success: true,
    message: `Vault unlocked: Welcome ${operator.display_name}.`,
    token,
    operator: {
      id: operator.id,
      username: operator.username,
      displayName: operator.display_name,
      mustChangePassword: Boolean(operator.must_change_password)
    },
    expiresInSeconds: 1800
  });
};

/**
 * GET /vault/check-auth - Verify current token status & re-sync operator info
 */
const checkVaultAuth = async (req, res) => {
  const operatorId = req.vaultUser?.operatorId || req.session?.vaultAuth?.operatorId;
  if (!operatorId) {
    return res.status(401).json({ success: false, message: 'Session expired' });
  }

  const op = await db('system_vault_operators').where({ id: operatorId }).first();
  if (!op || op.is_active === 0) {
    return res.status(401).json({ success: false, message: 'Operator account inactive' });
  }

  return res.json({
    success: true,
    authenticated: true,
    operator: {
      id: op.id,
      username: op.username,
      displayName: op.display_name,
      mustChangePassword: Boolean(op.must_change_password)
    }
  });
};

/**
 * POST /vault/profile - Update personal username, display name, and password
 */
const updateOperatorProfile = async (req, res) => {
  const operatorId = req.vaultUser?.operatorId || req.session?.vaultAuth?.operatorId;
  const { currentPassword, newUsername, newDisplayName, newPassword } = req.body;

  if (!operatorId) {
    return res.status(401).json({ success: false, message: 'Unauthorized session' });
  }

  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is required to verify identity.' });
  }

  try {
    const operator = await db('system_vault_operators').where({ id: operatorId }).first();
    if (!operator) {
      return res.status(404).json({ success: false, message: 'Operator not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, operator.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const updates = {};

    // 1. Update Username (if provided)
    if (newUsername && newUsername.trim()) {
      const cleanUser = newUsername.trim().toLowerCase();
      if (cleanUser !== operator.username) {
        const existing = await db('system_vault_operators')
          .whereRaw('LOWER(username) = ?', [cleanUser])
          .whereNot({ id: operatorId })
          .first();
        if (existing) {
          return res.status(400).json({ success: false, message: `Username "${cleanUser}" is already taken.` });
        }
        updates.username = cleanUser;
      }
    }

    // 2. Update Display Name (if provided)
    if (newDisplayName && newDisplayName.trim()) {
      updates.display_name = newDisplayName.trim();
    }

    // 3. Update Password (if provided)
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
      updates.must_change_password = 0; // Clears the mandatory change flag
    }

    if (Object.keys(updates).length > 0) {
      await db('system_vault_operators').where({ id: operatorId }).update(updates);
    }

    const updatedOp = await db('system_vault_operators').where({ id: operatorId }).first();

    // Re-issue refreshed token
    const tokenPayload = {
      role: 'vault_operator',
      operatorId: updatedOp.id,
      username: updatedOp.username,
      displayName: updatedOp.display_name,
      mustChangePassword: Boolean(updatedOp.must_change_password)
    };
    const refreshedToken = createVaultToken(tokenPayload);

    await logActivity(
      req,
      'VAULT',
      'CUSTODIAN_PROFILE_UPDATE',
      'VAULT',
      `Custodian ${updatedOp.display_name} (@${updatedOp.username}) updated their profile/password`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: 'Your custodian profile has been updated successfully.',
      token: refreshedToken,
      operator: {
        id: updatedOp.id,
        username: updatedOp.username,
        displayName: updatedOp.display_name,
        mustChangePassword: Boolean(updatedOp.must_change_password)
      }
    });
  } catch (err) {
    console.error('Operator profile update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update operator profile' });
  }
};

/**
 * GET /vault/overview - Full administrative overview
 */
const getVaultOverview = async (req, res) => {
  try {
    const [admins, departments, facultyCount, operators, recentAudit] = await Promise.all([
      db('admin').select('id', 'username', 'updated_at').orderBy('id', 'asc'),
      db('department').select('dept_id', 'dept_name', 'username', 'is_active', 'logo_url', 'brand_color', 'brand_accent').orderBy('dept_id', 'asc'),
      db('global_faculty').count('* as count').first(),
      db('system_vault_operators').select('id', 'username', 'display_name', 'last_login_at', 'is_active').orderBy('id', 'asc'),
      db('global_department_activity_logs')
        .where('entity', 'VAULT')
        .orWhere('action_type', 'like', '%RESET%')
        .orWhere('action_type', 'like', '%OVERRIDE%')
        .orWhere('action_type', 'like', '%CUSTODIAN%')
        .orderBy('log_id', 'desc')
        .limit(30)
    ]);

    res.json({
      success: true,
      admins,
      departments,
      operators,
      totalFaculty: facultyCount?.count || 0,
      recentAudit: recentAudit.map(log => ({
        id: log.log_id,
        dept_id: log.dept_id,
        action: log.action_type,
        entity: log.entity,
        details: log.description,
        ip: log.ip_address,
        device: log.device_info,
        status: log.status,
        timestamp: log.created_at
      }))
    });
  } catch (err) {
    console.error('Vault overview error:', err);
    res.status(500).json({ success: false, message: 'Database error fetching vault overview' });
  }
};

/**
 * GET /vault/faculty - Search, filter, and paginate faculty
 */
const getFacultyList = async (req, res) => {
  const { dept_id, search, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = db('global_faculty as f')
      .leftJoin('department as d', 'f.dept_id', 'd.dept_id');

    if (dept_id && dept_id !== 'ALL') {
      query = query.where('f.dept_id', String(dept_id).trim().toUpperCase());
    }

    if (search && search.trim()) {
      const s = `%${escapeSqlLike(search.trim())}%`;
      query = query.andWhere(builder => {
        builder.where('f.name', 'like', s)
          .orWhere('f.faculty_id', 'like', s)
          .orWhere('f.email', 'like', s);
      });
    }

    const countRes = await query.clone().count('* as count').first();
    const total = countRes?.count || 0;

    const rows = await query
      .clone()
      .select(
        'f.f_id',
        'f.faculty_id',
        'f.dept_id',
        'd.dept_name',
        'f.name',
        'f.email',
        'f.position',
        'f.is_active',
        'f.must_change_password',
        'f.profile_picture_url'
      )
      .orderBy(['f.dept_id', 'f.name'])
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Vault faculty list error:', err);
    res.status(500).json({ success: false, message: 'Database error fetching faculty roster' });
  }
};

/**
 * POST /vault/reset-admin - Reset any Administrator username / password
 */
const resetAdmin = async (req, res) => {
  const { adminId, newUsername, newPassword } = req.body;
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  if (!adminId) {
    return res.status(400).json({ success: false, message: 'Admin ID is required.' });
  }

  try {
    const admin = await db('admin').where({ id: adminId }).first();
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found.' });
    }

    const updates = { updated_at: db.fn.now() };

    if (newUsername && newUsername.trim()) {
      const cleanUser = newUsername.trim();
      const existing = await db('admin').where({ username: cleanUser }).whereNot({ id: adminId }).first();
      if (existing) {
        return res.status(400).json({ success: false, message: `Username "${cleanUser}" is already taken by another admin.` });
      }
      updates.username = cleanUser;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    await db('admin').where({ id: adminId }).update(updates);

    await logActivity(
      req,
      'ADMIN',
      'ROOT_RESET_ADMIN',
      'VAULT',
      `Admin ID ${adminId} (${updates.username || admin.username}) credentials reset by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: `Admin credentials for "${updates.username || admin.username}" updated successfully.`,
      updatedUsername: updates.username || admin.username
    });
  } catch (err) {
    console.error('Vault reset admin error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset admin credentials' });
  }
};

/**
 * POST /vault/reset-department - Reset Department ID, username, password, status
 */
const resetDepartment = async (req, res) => {
  const { deptId, newDeptId, newDeptName, newUsername, newPassword, isActive } = req.body;
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  if (!deptId) {
    return res.status(400).json({ success: false, message: 'Department ID is required.' });
  }

  const cleanDeptId = String(deptId).trim().toUpperCase();

  try {
    const dept = await db('department').where({ dept_id: cleanDeptId }).first();
    if (!dept) {
      return res.status(404).json({ success: false, message: `Department "${cleanDeptId}" not found.` });
    }

    const updates = {};

    if (typeof isActive === 'number' || typeof isActive === 'boolean') {
      updates.is_active = isActive ? 1 : 0;
    }

    if (newDeptName && newDeptName.trim()) {
      updates.dept_name = newDeptName.trim().toUpperCase();
    }

    if (newUsername && newUsername.trim()) {
      const cleanUser = newUsername.trim().toLowerCase();
      const existing = await db('department')
        .where({ username: cleanUser })
        .whereNot({ dept_id: cleanDeptId })
        .first();
      if (existing) {
        return res.status(400).json({ success: false, message: `Username "${cleanUser}" already in use by department ${existing.dept_id}.` });
      }
      updates.username = cleanUser;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);
      updates.password = hash;
      updates.hod_password = hash;
    }

    await db('department').where({ dept_id: cleanDeptId }).update(updates);

    await logActivity(
      req,
      cleanDeptId,
      'ROOT_RESET_DEPT',
      'VAULT',
      `Department ${cleanDeptId} credentials updated by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: `Department "${cleanDeptId}" updated successfully.`,
      dept: {
        dept_id: cleanDeptId,
        username: updates.username || dept.username,
        is_active: updates.is_active !== undefined ? updates.is_active : dept.is_active
      }
    });
  } catch (err) {
    console.error('Vault reset department error:', err);
    res.status(500).json({ success: false, message: 'Failed to update department credentials' });
  }
};

/**
 * POST /vault/reset-faculty - Reset Faculty ID, email/username, password, status
 */
const resetFaculty = async (req, res) => {
  const { facultyId, newEmail, newPassword, mustChangePassword, isActive } = req.body;
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  if (!facultyId) {
    return res.status(400).json({ success: false, message: 'Faculty ID is required.' });
  }

  const cleanFacId = String(facultyId).trim();

  try {
    const faculty = await db('global_faculty').where({ faculty_id: cleanFacId }).first();
    if (!faculty) {
      return res.status(404).json({ success: false, message: `Faculty "${cleanFacId}" not found.` });
    }

    const updates = {};

    if (typeof isActive === 'number' || typeof isActive === 'boolean') {
      updates.is_active = isActive ? 1 : 0;
    }

    if (typeof mustChangePassword === 'boolean') {
      updates.must_change_password = mustChangePassword ? 1 : 0;
    }

    if (newEmail && newEmail.trim()) {
      const cleanEmail = newEmail.trim().toLowerCase();
      const existing = await db('global_faculty')
        .where({ email: cleanEmail })
        .whereNot({ faculty_id: cleanFacId })
        .first();
      if (existing) {
        return res.status(400).json({ success: false, message: `Email "${cleanEmail}" is already registered to another faculty.` });
      }
      updates.email = cleanEmail;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(newPassword, salt);
    }

    await db('global_faculty').where({ faculty_id: cleanFacId }).update(updates);

    if (updates.email) {
      await db('global_directory')
        .where({ user_id: cleanFacId, role: 'faculty' })
        .update({ user_id: cleanFacId })
        .catch(() => {});
    }

    await logActivity(
      req,
      faculty.dept_id || 'FACULTY',
      'ROOT_RESET_FACULTY',
      'VAULT',
      `Faculty ${faculty.name} (${cleanFacId}) credentials updated by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: `Faculty "${faculty.name}" (${cleanFacId}) updated successfully.`,
      faculty: {
        faculty_id: cleanFacId,
        name: faculty.name,
        email: updates.email || faculty.email,
        is_active: updates.is_active !== undefined ? updates.is_active : faculty.is_active
      }
    });
  } catch (err) {
    console.error('Vault reset faculty error:', err);
    res.status(500).json({ success: false, message: 'Failed to update faculty credentials' });
  }
};

const submissionQueue = require('../services/submissionQueue');
const cacheService = require('../services/cacheService');

/**
 * GET /vault/students - Search, filter, and paginate students
 */
const getStudentList = async (req, res) => {
  const { search, dept_id, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  try {
    let query = db('global_students as s')
      .leftJoin('department as d', 's.dept_id', 'd.dept_id');

    if (dept_id && dept_id !== 'ALL') {
      query = query.where('s.dept_id', String(dept_id).trim().toUpperCase());
    }

    if (search && search.trim()) {
      const s = `%${escapeSqlLike(search.trim())}%`;
      query = query.andWhere(builder => {
        builder.where('s.usn', 'like', s)
          .orWhere('s.name', 'like', s);
      });
    }

    const countRes = await query.clone().count('* as count').first();
    const total = countRes?.count || 0;

    const rows = await query
      .clone()
      .select(
        's.usn',
        's.name',
        's.dept_id',
        'd.dept_name',
        's.sem',
        's.section',
        's.session_id',
        's.feedback_given',
        's.email'
      )
      .orderBy('s.dept_id', 'asc')
      .orderBy('s.usn', 'asc')
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Vault student list error:', err);
    res.status(500).json({ success: false, message: 'Database error fetching students' });
  }
};

/**
 * POST /vault/students/reset-submission - Emergency reset student feedback state to PENDING
 */
const resetStudentSubmission = async (req, res) => {
  const { usn } = req.body;
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  if (!usn) {
    return res.status(400).json({ success: false, message: 'Student USN is required.' });
  }

  const cleanUsn = String(usn).trim().toUpperCase();

  try {
    const student = await db('global_students').where({ usn: cleanUsn }).first();
    if (!student) {
      return res.status(404).json({ success: false, message: `Student with USN "${cleanUsn}" not found.` });
    }

    // Reset feedback_given to 'pending'
    await db('global_students').where({ usn: cleanUsn }).update({
      feedback_given: 'pending'
    });

    await logActivity(
      req,
      student.dept_id || 'STUDENT',
      'EMERGENCY_STUDENT_RESET',
      'VAULT',
      `Student USN ${cleanUsn} feedback state reset to PENDING by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: `Feedback submission state for student "${cleanUsn}" (${student.name}) has been reset to PENDING. Student may now resubmit evaluation.`,
      student: {
        usn: cleanUsn,
        name: student.name,
        dept_id: student.dept_id,
        feedback_given: 'pending'
      }
    });
  } catch (err) {
    console.error('Vault reset student submission error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset student submission' });
  }
};

/**
 * POST /vault/sessions/toggle-status - Emergency freeze or resume feedback sessions
 */
const toggleSessionStatus = async (req, res) => {
  const { sessionId, newStatus } = req.body;
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  if (!sessionId || !newStatus) {
    return res.status(400).json({ success: false, message: 'Session ID and new status are required.' });
  }

  const validStatuses = ['active', 'paused', 'completed'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const session = await db('global_sessions').where({ session_id: sessionId }).first();
    if (!session) {
      return res.status(404).json({ success: false, message: `Session "${sessionId}" not found.` });
    }

    await db('global_sessions').where({ session_id: sessionId }).update({ status: newStatus });

    await logActivity(
      req,
      session.dept_id || 'SYSTEM',
      'EMERGENCY_SESSION_OVERRIDE',
      'VAULT',
      `Session ${sessionId} (Sem ${session.sem} Sec ${session.section}) status changed to "${newStatus}" by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    return res.json({
      success: true,
      message: `Session "${sessionId}" status updated to "${newStatus}".`,
      session: { session_id: sessionId, status: newStatus }
    });
  } catch (err) {
    console.error('Vault toggle session status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update session status' });
  }
};

/**
 * GET /vault/engine - Real-time queue, cache, and system telemetry
 */
const getEngineStatus = async (req, res) => {
  try {
    const queueStatus = submissionQueue ? submissionQueue.getStatus() : { queueLength: 0 };
    const memoryUsage = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());

    const [activeSessions, totalSubmissions, totalStudents] = await Promise.all([
      db('global_sessions').where({ status: 'active' }).count('* as count').first(),
      db('global_student_feedback').count('* as count').first(),
      db('global_students').count('* as count').first()
    ]);

    res.json({
      success: true,
      engine: {
        uptime: uptimeSec,
        memory: {
          heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMb: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        queue: queueStatus,
        activeSessions: activeSessions?.count || 0,
        totalRatings: totalSubmissions?.count || 0,
        totalStudents: totalStudents?.count || 0
      }
    });
  } catch (err) {
    console.error('Vault get engine status error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve engine metrics' });
  }
};

/**
 * POST /vault/engine/drain-queue - Force immediate queue flush to database
 */
const forceQueueDrain = async (req, res) => {
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  try {
    const pendingCount = submissionQueue ? submissionQueue.getQueueLength() : 0;
    const drained = submissionQueue ? await submissionQueue.drain(10000) : 0;

    await logActivity(
      req,
      'SYSTEM',
      'FORCE_QUEUE_DRAIN',
      'VAULT',
      `Manual submission queue drain executed by Custodian ${operatorTag}. Drained ${drained} items.`,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: `Successfully forced queue drain to TiDB: ${drained} items flushed.`,
      initialPending: pendingCount,
      remainingInQueue: submissionQueue ? submissionQueue.getQueueLength() : 0
    });
  } catch (err) {
    console.error('Vault force queue drain error:', err);
    res.status(500).json({ success: false, message: 'Failed to drain submission queue' });
  }
};

/**
 * POST /vault/engine/purge-cache - Flush in-memory questions and department cache
 */
const purgeCache = async (req, res) => {
  const operatorTag = req.vaultUser?.displayName 
    ? `${req.vaultUser.displayName} (@${req.vaultUser.username})` 
    : 'Vault Custodian';

  try {
    if (cacheService && typeof cacheService.flushAll === 'function') {
      cacheService.flushAll();
    }

    await logActivity(
      req,
      'SYSTEM',
      'FORCE_CACHE_PURGE',
      'VAULT',
      `In-memory application cache purged completely by Custodian ${operatorTag}`,
      'SUCCESS'
    );

    res.json({
      success: true,
      message: 'In-memory question and department cache purged completely.'
    });
  } catch (err) {
    console.error('Vault purge cache error:', err);
    res.status(500).json({ success: false, message: 'Failed to purge cache' });
  }
};

/**
 * GET /vault/audit-stream - Live stream of recent audit logs
 */
const getAuditStream = async (req, res) => {
  const { limit = 50, status } = req.query;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  try {
    let query = db('global_department_activity_logs')
      .orderBy('log_id', 'desc')
      .limit(limitNum);

    if (status && status !== 'ALL') {
      query = query.where({ status: String(status).toUpperCase() });
    }

    const logs = await query;
    res.json({
      success: true,
      data: logs.map(l => ({
        id: l.log_id,
        dept_id: l.dept_id,
        action: l.action_type,
        entity: l.entity,
        description: l.description,
        ip: l.ip_address,
        device: l.device_info,
        status: l.status,
        timestamp: l.created_at
      }))
    });
  } catch (err) {
    console.error('Vault audit stream error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit stream' });
  }
};

/**
 * POST /vault/logout - Terminate Vault Session
 */
const logoutVault = async (req, res) => {
  if (req.session?.vaultAuth) {
    delete req.session.vaultAuth;
  }
  return res.json({ success: true, message: 'Vault session terminated.' });
};

module.exports = {
  authenticateVault,
  checkVaultAuth,
  updateOperatorProfile,
  getVaultOverview,
  getFacultyList,
  resetAdmin,
  resetDepartment,
  resetFaculty,
  getStudentList,
  resetStudentSubmission,
  toggleSessionStatus,
  getEngineStatus,
  forceQueueDrain,
  purgeCache,
  getAuditStream,
  logoutVault,
  verifyVaultToken
};
