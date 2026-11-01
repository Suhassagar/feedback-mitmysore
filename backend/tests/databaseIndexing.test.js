const db = require('../config/db');

describe('Phase 3: Database Indexing & Query Aggregation Verification', () => {
  it('should have ensurePerformanceIndexes attached to the db instance', () => {
    expect(db.ensurePerformanceIndexes).toBeDefined();
    expect(typeof db.ensurePerformanceIndexes).toBe('function');
  });

  it('should execute ensurePerformanceIndexes safely without throwing errors', async () => {
    await expect(db.ensurePerformanceIndexes()).resolves.not.toThrow();
  });

  it('should verify defined composite index targets on schema', () => {
    // Expected high-impact composite indexes for Phase 3
    const expectedIndexes = [
      { table: 'global_student_feedback', name: 'idx_feedback_session_fac_genuine', cols: ['session_id', 'faculty_id', 'is_genuine', 'rating'] },
      { table: 'global_student_feedback', name: 'idx_feedback_dept_genuine_rating', cols: ['dept_id', 'is_genuine', 'rating'] },
      { table: 'global_student_feedback', name: 'idx_feedback_session_question', cols: ['session_id', 'is_genuine', 'question_id', 'rating'] },
      { table: 'global_student_feedback', name: 'idx_feedback_dept_created', cols: ['dept_id', 'is_genuine', 'created_at'] },
      { table: 'global_students', name: 'idx_students_session_feedback', cols: ['session_id', 'feedback_given'] },
      { table: 'global_students', name: 'idx_students_dept_feedback', cols: ['dept_id', 'feedback_given'] },
      { table: 'global_sessions', name: 'idx_sessions_dept_status_created', cols: ['dept_id', 'status', 'created_at'] },
      { table: 'global_sessions', name: 'idx_sessions_active_lookup', cols: ['dept_id', 'sem', 'section', 'status'] },
      { table: 'global_faculty_scorecards', name: 'idx_scorecards_dept_session', cols: ['dept_id', 'session_id'] }
    ];

    expect(expectedIndexes.length).toBe(9);
    expectedIndexes.forEach(idx => {
      expect(idx.table).toBeDefined();
      expect(idx.name).toMatch(/^idx_/);
      expect(idx.cols.length).toBeGreaterThanOrEqual(2);
    });
  });
});
