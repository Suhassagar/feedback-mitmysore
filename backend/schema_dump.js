const db = require('./config/db');

async function dumpSchema() {
  try {
    const tables = await db.raw('SHOW TABLES');
    const tableNames = tables[0].map(t => Object.values(t)[0]);
    
    for (const table of tableNames) {
      const createStmt = await db.raw(`SHOW CREATE TABLE \`${table}\``);
      console.log(`\n--- TABLE: ${table} ---`);
      console.log(createStmt[0][0]['Create Table']);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
dumpSchema();
