const db = require('./backend/config/db');

async function migrate() {
  try {
    console.log("Adding JSON embedding columns to remarks tables...");
    
    // global_faculty_remarks
    let hasCol1 = await db.schema.hasColumn('global_faculty_remarks', 'embedding');
    if (!hasCol1) {
      await db.schema.alterTable('global_faculty_remarks', t => {
        t.json('embedding').nullable(); // JSON column for MariaDB/MySQL
      });
      console.log("Added embedding to global_faculty_remarks");
    }

    // global_section_remarks
    let hasCol2 = await db.schema.hasColumn('global_section_remarks', 'embedding');
    if (!hasCol2) {
      await db.schema.alterTable('global_section_remarks', t => {
        t.json('embedding').nullable();
      });
      console.log("Added embedding to global_section_remarks");
    }

    // global_session_remarks
    let hasCol3 = await db.schema.hasColumn('global_session_remarks', 'embedding');
    if (!hasCol3) {
      await db.schema.alterTable('global_session_remarks', t => {
        t.json('embedding').nullable();
      });
      console.log("Added embedding to global_session_remarks");
    }

    console.log("Migration complete.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
