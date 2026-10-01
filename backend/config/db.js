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

db.schema.hasTable('global_faculty_remarks').then(exists => {
  if (!exists) {
    return db.schema.createTable('global_faculty_remarks', table => {
      table.increments('id').primary();
      table.string('session_id', 50).notNullable();
      table.string('dept_id', 50).notNullable();
      table.string('faculty_id', 50).notNullable();
      table.string('course_id', 50).notNullable();
      table.text('remark_text').notNullable();
      table.decimal('sentiment_score', 5, 2).nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['session_id', 'dept_id'], 'idx_fac_remarks_session');
      table.index(['faculty_id', 'course_id'], 'idx_fac_remarks_faculty');
    }).then(() => console.log('✅ Created missing global_faculty_remarks table in database'));
  }
}).catch(e => console.error('Auto-migration warning (global_faculty_remarks):', e.message));

// Self-healing: Ensure performance composite indexes exist on boot
db.schema.hasTable('global_section_remarks').then(exists => {
  if (!exists) {
    return db.schema.createTable('global_section_remarks', table => {
      table.increments('id').primary();
      table.string('session_id', 50).notNullable();
      table.string('dept_id', 50).notNullable();
      table.string('faculty_id', 50).notNullable();
      table.string('course_id', 50).notNullable();
      table.string('section_heading', 255).notNullable();
      table.text('remark_text').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['faculty_id', 'course_id', 'section_heading'], 'idx_section_remarks_lookup');
      table.index(['session_id', 'dept_id'], 'idx_section_remarks_session');
    }).then(() => console.log('✅ Created missing global_section_remarks table in database'));
  }
}).catch(e => console.error('Auto-migration warning (global_section_remarks):', e.message));
// Self-healing: Ensure global_department_activity_logs exists on boot
db.schema.hasTable('global_department_activity_logs').then(exists => {
  if (!exists) {
    return db.schema.createTable('global_department_activity_logs', table => {
      table.increments('log_id').primary();
      table.string('dept_id', 50).notNullable();
      table.string('action_type', 50).notNullable();
      table.string('entity', 50).notNullable().defaultTo('SYSTEM');
      table.text('description').notNullable();
      table.string('ip_address', 100).nullable();
      table.string('device_info', 255).nullable();
      table.string('status', 20).defaultTo('SUCCESS');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['dept_id', 'created_at'], 'idx_activity_dept_created');
      table.index(['action_type'], 'idx_activity_action');
    }).then(() => console.log('✅ Created missing global_department_activity_logs table in database'));
  }
}).catch(e => console.error('Auto-migration warning (global_department_activity_logs):', e.message));

async function ensurePerformanceIndexes() {
  try {
    const feedbackExists = await db.schema.hasTable('global_student_feedback');
    if (feedbackExists) {
      await db.schema.hasColumn('global_student_feedback', 'is_genuine').then(async exists => {
        if (!exists) {
          await db.schema.table('global_student_feedback', t => t.boolean('is_genuine').defaultTo(true));
          console.log('✅ Added missing is_genuine column for variance shadowbanning');
        }
      });
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

    const logsExists = await db.schema.hasTable('global_department_activity_logs');
    if (logsExists) {
      await db.schema.hasColumn('global_department_activity_logs', 'status').then(async exists => {
        if (!exists) {
          await db.schema.table('global_department_activity_logs', t => t.string('status', 20).defaultTo('SUCCESS'));
          console.log('✅ Added missing status column to global_department_activity_logs');
        }
      });
      await db.raw('ALTER TABLE global_department_activity_logs ADD INDEX idx_activity_dept_created (dept_id, created_at)').catch(err => {
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
