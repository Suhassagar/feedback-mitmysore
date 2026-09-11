const db = require('./config/db');

async function addEmailColumn() {
  try {
    const hasColumn = await db.schema.hasColumn('global_students', 'email');
    if (!hasColumn) {
      await db.schema.alterTable('global_students', function(t) {
        t.string('email', 255).nullable();
      });
      console.log('Successfully added email column to global_students');
    } else {
      console.log('Email column already exists');
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    db.destroy();
  }
}

addEmailColumn();
