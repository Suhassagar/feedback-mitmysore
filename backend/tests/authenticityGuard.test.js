const { submitFeedback } = require('../controllers/feedbackController');
const { SubmissionQueue } = require('../services/submissionQueue');
const db = require('../config/db');

describe('Dynamic Feedback Authenticity Guard & Reflection Loop', () => {

  const createMockReq = ({
    usn = '1ME21CS099',
    session_id = 'SESS_AUTH_GUARD_01',
    dept_id = 'CSE',
    attempt = 1,
    justification = '',
    ratings = [5, 5, 5, 5]
  }) => {
    return {
      session: {
        role: 'student',
        usn,
        session_id,
        dept_id,
        feedback_start_time: Date.now() - 600000 // 10 minutes ago to bypass dwell timer
      },
      body: {
        session_id,
        idempotency_key: `IDEM_${Date.now()}_${Math.random()}`,
        submission_attempt: attempt,
        justification_remark: justification,
        department_remark: 'Good infrastructure',
        facultyList: [
          {
            faculty_id: 'FAC_01',
            course_id: 'CS101',
            feedback: { q1: ratings[0], q2: ratings[1] }
          },
          {
            faculty_id: 'FAC_02',
            course_id: 'CS102',
            feedback: { q3: ratings[2], q4: ratings[3] }
          }
        ]
      },
      app: {
        get: () => null
      }
    };
  };

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  it('Challenge 1: Rejects straight-lined ratings (all 5s) on Attempt 1 with HTTP 422 INTEGRITY_RETRY_REQUIRED', async () => {
    const req = createMockReq({
      attempt: 1,
      ratings: [5, 5, 5, 5]
    });
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INTEGRITY_RETRY_REQUIRED');
    expect(res.body.attempt).toBe(1);
    expect(res.body.detected_score).toBe(5);
    expect(res.body.message).toContain('Uniform rating of 5/5 detected');
  });

  it('Challenge 1 (Low straight-lining): Rejects straight-lined ratings (all 1s) on Attempt 1 with HTTP 422', async () => {
    const req = createMockReq({
      attempt: 1,
      ratings: [1, 1, 1, 1]
    });
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INTEGRITY_RETRY_REQUIRED');
    expect(res.body.attempt).toBe(1);
    expect(res.body.detected_score).toBe(1);
  });

  it('Challenge 2: Rejects straight-lined ratings on Attempt 2 if justification is missing or under 10 chars', async () => {
    const req = createMockReq({
      attempt: 2,
      justification: 'too short', // 9 characters
      ratings: [4, 4, 4, 4]
    });
    const res = createMockRes();

    await submitFeedback(req, res);

    expect(res.statusCode).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('JUSTIFICATION_REQUIRED');
    expect(res.body.attempt).toBe(2);
    expect(res.body.detected_score).toBe(4);
  });

  it('Challenge 2b: Bypasses 422 integrity challenge on Attempt 2 when valid justification (>= 10 chars) is provided', async () => {
    const req = createMockReq({
      attempt: 2,
      justification: 'Every faculty member showed exceptional pedagogical clarity and dedication throughout the course.',
      ratings: [5, 5, 5, 5]
    });
    const res = createMockRes();

    try {
      await submitFeedback(req, res);
    } catch {
      // Any subsequent DB connection failure is expected in unit test mode
    }

    // Must NOT be rejected with 422 Integrity Challenge
    expect(res.statusCode).not.toBe(422);
  });

  it('Verification 4: Differentiated ratings (variance > 0) on Attempt 1 bypass the 422 integrity challenge', async () => {
    const req = createMockReq({
      attempt: 1,
      ratings: [5, 4, 3, 5] // variance > 0
    });
    const res = createMockRes();

    try {
      await submitFeedback(req, res);
    } catch {
      // Any subsequent DB connection failure is expected in unit test mode
    }

    // Must NOT be rejected with 422 Integrity Challenge
    expect(res.statusCode).not.toBe(422);
  });

  it('Challenge 3: Dual-Layer Scorecard Consolidation captures both raw and verified metrics', () => {
    const queue = new SubmissionQueue({ batchSize: 50, flushIntervalMs: 5000 });
    queue.stop();

    const items = [
      {
        scorecardUpdatesToInsert: [
          {
            dept_id: 'CSE',
            faculty_id: 'FAC_AI',
            course_id: 'CS701',
            session_id: 'SESS_BATCH',
            sum: 20, // verified sum
            count: 4,
            genuineCount: 1,
            excellent: 4,
            good: 0,
            average: 0,
            poor: 0,
            rawSum: 20,
            rawCount: 4
          }
        ]
      },
      {
        scorecardUpdatesToInsert: [
          {
            dept_id: 'CSE',
            faculty_id: 'FAC_AI',
            course_id: 'CS701',
            session_id: 'SESS_BATCH',
            sum: 0, // unverified (or raw only)
            count: 4,
            genuineCount: 0,
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0,
            rawSum: 16,
            rawCount: 4
          }
        ]
      }
    ];

    const consolidated = queue.consolidateScorecards(items);
    expect(consolidated.length).toBe(1);

    const facultyCard = consolidated[0];
    expect(facultyCard.faculty_id).toBe('FAC_AI');
    expect(facultyCard.sum).toBe(20); // verified total
    expect(facultyCard.rawSum).toBe(36); // total raw score (20 + 16)
    expect(facultyCard.rawCount).toBe(8); // total raw count (4 + 4)
  });
});
