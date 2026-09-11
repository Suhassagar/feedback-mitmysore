const db = require('../config/db');
const UAParser = require('ua-parser-js');

const logActivity = async (req, dept_id, action_type, entity, description) => {
  try {
    let raw_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    let ip_address = raw_ip;
    
    // Clean up local IP addresses
    if (raw_ip === '::1' || raw_ip === '127.0.0.1' || raw_ip === '::ffff:127.0.0.1') {
      ip_address = '127.0.0.1 (Localhost)';
    }

    const raw_user_agent = req.headers['user-agent'] || '';
    const browser_override = req.headers['x-browser-override'];
    let device_info = 'Unknown Device';
    
    if (raw_user_agent) {
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
    }
    
    // Using Knex targeting the global table
    await db('global_department_activity_logs').insert({
      dept_id,
      action_type,
      entity,
      description,
      ip_address,
      device_info
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
};

module.exports = { logActivity };
