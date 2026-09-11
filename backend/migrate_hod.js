const db = require('./config/db');
const bcrypt = require('bcrypt');

async function migrateHodPassword() {
  try {
    const hasColumn = await db.schema.hasColumn('department', 'hod_password');
    if (!hasColumn) {
      await db.schema.alterTable('department', function(t) {
        t.string('hod_password', 255).nullable();
      });
      console.log('Added hod_password column to department table.');
      
      const defaultPassword = await bcrypt.hash('hod123', 10);
      await db('department').update({ hod_password: defaultPassword });
      console.log('Set default HOD password (hod123) for all existing departments.');
    } else {
      console.log('hod_password column already exists.');
    }
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    db.destroy();
  }
}

migrateHodPassword();
