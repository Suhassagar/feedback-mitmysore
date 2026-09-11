const db = require('./backend/config/db');
async function test() {
  try {
    const rows = await db('department').where({ is_active: true });
    console.log(rows);
  } catch(e) {
    console.error("DB Error:", e.message);
  }
  process.exit(0);
}
test();
