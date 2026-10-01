const db = require('../config/db');
const UAParser = require('ua-parser-js');

/**
 * Enterprise Audit Logging Engine
 * Captures user actions, administrative interventions, security alerts, and system mutations.
 */
const logActivity = async (req, dept_id, action_type, entity, description, status = 'SUCCESS') => {
  try {
    // 1. Reliable IP resolution with proxy support
    let raw_ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'Unknown';
    if (typeof raw_ip === 'string' && raw_ip.includes(',')) {
      raw_ip = raw_ip.split(',')[0].trim();
    }
    let ip_address = String(raw_ip).substring(0, 95);
    
    // Normalize localhost addresses for readability
    if (raw_ip === '::1' || raw_ip === '127.0.0.1' || raw_ip === '::ffff:127.0.0.1') {
      ip_address = '127.0.0.1 (Localhost)';
    }

    // 2. Client Device & User-Agent Parsing
    const raw_user_agent = req?.headers?.['user-agent'] || '';
    const browser_override = req?.headers?.['x-browser-override'];
    let device_info = 'Unknown Device';
    
    if (raw_user_agent) {
      try {
        const parser = new UAParser(raw_user_agent);
        let browser = parser.getBrowser().name || 'Unknown Browser';
        const os = parser.getOS().name || 'Unknown OS';
        
        if (browser_override === 'Brave') {
          browser = 'Brave';
        }
        
        device_info = `${browser} on ${os}`;
        
        if (device_info === 'Unknown Browser on Unknown OS') {
          device_info = raw_user_agent.substring(0, 50);
        }
      } catch {
        device_info = raw_user_agent.substring(0, 50);
      }
    }
    
    // 3. Normalized Payload Assembly
    const cleanDeptId = dept_id ? String(dept_id).trim().toUpperCase() : 'SYSTEM';
    const cleanAction = action_type ? String(action_type).trim().toUpperCase() : 'SYSTEM';
    const cleanEntity = entity ? String(entity).trim().toUpperCase() : 'SYSTEM';
    const cleanStatus = status ? String(status).trim().toUpperCase() : 'SUCCESS';

    const insertPayload = {
      dept_id: cleanDeptId,
      action_type: cleanAction,
      entity: cleanEntity,
      description: description || '',
      ip_address,
      device_info,
      status: cleanStatus
    };

    // 4. Persistence with fallback if status column is pending migration
    try {
      await db('global_department_activity_logs').insert(insertPayload);
    } catch (dbErr) {
      if (dbErr.message?.includes("Unknown column 'status'") || dbErr.code === 'ER_BAD_FIELD_ERROR') {
        delete insertPayload.status;
        await db('global_department_activity_logs').insert(insertPayload);
      } else {
        throw dbErr;
      }
    }
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
};

module.exports = { logActivity };
