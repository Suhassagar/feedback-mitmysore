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

module.exports = db;
