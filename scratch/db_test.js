const db = require('../backend/config/db');

async function test() {
  try {
    console.log('--- global_students ---');
    const [cols1] = await db.raw('SHOW COLUMNS FROM global_students');
    console.log(cols1.map(c => c.Field).join(', '));

    console.log('\n--- global_student_feedback ---');
    const [cols2] = await db.raw('SHOW COLUMNS FROM global_student_feedback');
    console.log(cols2.map(c => c.Field).join(', '));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
test();
