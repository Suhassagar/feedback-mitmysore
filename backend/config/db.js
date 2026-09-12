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
  },
  pool: { 
    min: 2, 
    max: 150 
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

module.exports = db;
