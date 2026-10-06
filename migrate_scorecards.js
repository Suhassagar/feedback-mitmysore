const db = require('./backend/config/db');

async function migrate() {
  try {
    console.log("Creating global_faculty_scorecards table...");
    
    const exists = await db.schema.hasTable('global_faculty_scorecards');
    if (!exists) {
      await db.schema.createTable('global_faculty_scorecards', table => {
        table.string('dept_id', 50).notNullable();
        table.string('faculty_id', 50).notNullable();
        table.string('course_id', 50).notNullable();
        table.string('session_id', 50).notNullable();
        
        table.integer('total_score_sum').notNullable().defaultTo(0);
        table.integer('ratings_count').notNullable().defaultTo(0);
        table.integer('genuine_count').notNullable().defaultTo(0);
        
        table.integer('excellent_count').notNullable().defaultTo(0);
        table.integer('good_count').notNullable().defaultTo(0);
        table.integer('average_count').notNullable().defaultTo(0);
        table.integer('poor_count').notNullable().defaultTo(0);
        
        table.primary(['dept_id', 'faculty_id', 'course_id', 'session_id']);
      });
      console.log("Table created.");
      
      console.log("Backfilling historical data into scorecards...");
      await db.raw(`
        INSERT INTO global_faculty_scorecards (
          dept_id, faculty_id, course_id, session_id, 
          total_score_sum, ratings_count, genuine_count, 
          excellent_count, good_count, average_count, poor_count
        )
        SELECT 
          dept_id, 
          faculty_id, 
          course_id, 
          session_id, 
          SUM(CASE WHEN is_genuine = 1 THEN rating ELSE 0 END) as total_score_sum, 
          COUNT(rating) as ratings_count, 
          SUM(CASE WHEN is_genuine = 1 THEN 1 ELSE 0 END) as genuine_count, 
          SUM(CASE WHEN is_genuine = 1 AND rating >= 4.5 THEN 1 ELSE 0 END) as excellent_count, 
          SUM(CASE WHEN is_genuine = 1 AND rating >= 3.5 AND rating < 4.5 THEN 1 ELSE 0 END) as good_count, 
          SUM(CASE WHEN is_genuine = 1 AND rating >= 2.5 AND rating < 3.5 THEN 1 ELSE 0 END) as average_count, 
          SUM(CASE WHEN is_genuine = 1 AND rating < 2.5 THEN 1 ELSE 0 END) as poor_count
        FROM global_student_feedback
        GROUP BY dept_id, faculty_id, course_id, session_id
      `);
      console.log("Backfill complete.");
    } else {
      console.log("Table global_faculty_scorecards already exists.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
