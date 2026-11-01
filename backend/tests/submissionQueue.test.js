const { SubmissionQueue } = require('../services/submissionQueue');

describe('Phase 4: Submission Queue & Micro-Batching Verification', () => {
  let queue;

  beforeEach(() => {
    queue = new SubmissionQueue({ batchSize: 10, flushIntervalMs: 5000 });
    queue.stop(); // Stop automatic timer during unit tests
  });

  afterEach(() => {
    queue.stop();
  });

  it('should enqueue items and correctly track queue length', () => {
    expect(queue.getQueueLength()).toBe(0);

    queue.enqueue({
      dept_id: 'CSE',
      session_id: 'SESS_TEST_1',
      ratingsToInsert: [{ faculty_id: 'FAC01', rating: 5 }]
    });

    expect(queue.getQueueLength()).toBe(1);
  });

  it('should consolidate duplicate faculty scorecard updates in memory', () => {
    // Simulate 3 students submitting feedback for the same faculty and course in this batch
    const items = [
      {
        scorecardUpdatesToInsert: [
          {
            dept_id: 'CSE', faculty_id: 'FAC_KUMAR', course_id: '21CS61', session_id: 'SESS_101',
            sum: 45, count: 10, genuineCount: 1, excellent: 8, good: 2, average: 0, poor: 0
          }
        ]
      },
      {
        scorecardUpdatesToInsert: [
          {
            dept_id: 'CSE', faculty_id: 'FAC_KUMAR', course_id: '21CS61', session_id: 'SESS_101',
            sum: 40, count: 10, genuineCount: 1, excellent: 6, good: 4, average: 0, poor: 0
          }
        ]
      },
      {
        scorecardUpdatesToInsert: [
          {
            dept_id: 'CSE', faculty_id: 'FAC_KUMAR', course_id: '21CS61', session_id: 'SESS_101',
            sum: 50, count: 10, genuineCount: 1, excellent: 10, good: 0, average: 0, poor: 0
          },
          {
            // Another faculty in the same batch
            dept_id: 'CSE', faculty_id: 'FAC_RAMESH', course_id: '21CS62', session_id: 'SESS_101',
            sum: 35, count: 10, genuineCount: 1, excellent: 3, good: 5, average: 2, poor: 0
          }
        ]
      }
    ];

    const consolidated = queue.consolidateScorecards(items);

    // 4 submissions across 3 students should consolidate into exactly 2 unique updates
    expect(consolidated.length).toBe(2);

    const kumar = consolidated.find(s => s.faculty_id === 'FAC_KUMAR');
    expect(kumar).toBeDefined();
    expect(kumar.sum).toBe(135); // 45 + 40 + 50
    expect(kumar.count).toBe(30); // 10 + 10 + 10
    expect(kumar.genuineCount).toBe(3);
    expect(kumar.excellent).toBe(24); // 8 + 6 + 10
    expect(kumar.good).toBe(6); // 2 + 4 + 0

    const ramesh = consolidated.find(s => s.faculty_id === 'FAC_RAMESH');
    expect(ramesh).toBeDefined();
    expect(ramesh.sum).toBe(35);
  });
});
