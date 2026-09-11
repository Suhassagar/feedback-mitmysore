const db = require('./config/db');

async function testQuery() {
  try {
    const cols = await db('department').columnInfo();
    console.log("Columns:", Object.keys(cols));
    
    const rows = await db('department').where({ is_active: true });
    console.log("Success:", rows);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    db.destroy();
  }
}

testQuery();
