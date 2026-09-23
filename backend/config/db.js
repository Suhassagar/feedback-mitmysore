const knex = require('knex');

const dbOptions = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "college_feedback_system",
    port: Number(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 30000,
  },
  pool: { 
    min: 0, 
    max: 25,
    acquireTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
    afterCreate: (conn, done) => {
      conn.query('SET NAMES utf8mb4;', (err) => {
        done(err, conn);
      });
    }
  }
};

const db = knex(dbOptions);

// Self-healing: Ensure required tables exist on boot
db.schema.hasTable('global_used_tokens').then(exists => {
  if (!exists) {
    return db.schema.createTable('global_used_tokens', table => {
      table.string('token', 100).primary();
      table.timestamp('created_at').defaultTo(db.fn.now());
    }).then(() => console.log('✅ Created missing global_used_tokens table in database'));
  }
}).catch(e => console.error('Auto-migration warning:', e.message));

// Self-healing: Ensure performance composite indexes exist on boot
async function ensurePerformanceIndexes() {
  try {
    const feedbackExists = await db.schema.hasTable('global_student_feedback');
    if (feedbackExists) {
      await db.raw('ALTER TABLE global_student_feedback ADD INDEX idx_feedback_session_dept (session_id, dept_id)').catch(err => {
        if (!err.message?.includes('Duplicate key name') && err.code !== 'ER_DUP_KEYNAME') {
          // Ignored if index already exists
        }
      });
      await db.raw('ALTER TABLE global_student_feedback ADD INDEX idx_feedback_faculty_course (faculty_id, course_id, dept_id)').catch(err => {
        if (!err.message?.includes('Duplicate key name') && err.code !== 'ER_DUP_KEYNAME') {
          // Ignored if index already exists
        }
      });
    }

    const studentsExists = await db.schema.hasTable('global_students');
    if (studentsExists) {
      await db.raw('ALTER TABLE global_students ADD INDEX idx_students_dept_sem_sec (dept_id, sem, section)').catch(err => {
        if (!err.message?.includes('Duplicate key name') && err.code !== 'ER_DUP_KEYNAME') {
          // Ignored if index already exists
        }
      });
    }
  } catch (err) {
    // Non-blocking background verification
  }
}
ensurePerformanceIndexes();

module.exports = db;
