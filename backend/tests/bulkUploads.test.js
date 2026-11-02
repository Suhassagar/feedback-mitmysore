const { bulkUploadQuestions } = require('../controllers/feedbackController');
const { bulkUploadFaculty } = require('../controllers/facultyController');
const { bulkUploadCourses } = require('../controllers/courseController');
const { bulkUploadStudents } = require('../controllers/systemController');
const db = require('../config/db');

describe('Bulk Upload Endpoints Verification', () => {
  const TEST_DEPT = 'TEST_BULK_DEPT';

  const createMockReq = (role, dept_id, body) => ({
    session: { role, dept_id },
    body,
    query: {}
  });

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(payload) {
        this.jsonPayload = payload;
        return this;
      }
    };
    return res;
  };

  beforeAll(async () => {
    // Ensure test department exists
    const existing = await db('department').where({ dept_id: TEST_DEPT }).first();
    if (!existing) {
      await db('department').insert({ dept_id: TEST_DEPT, dept_name: 'Test Bulk Department' });
    }
  });

  afterAll(async () => {
    // Cleanup test data
    await db('global_feedback_questions').where({ dept_id: TEST_DEPT }).del();
    await db('global_faculty').where({ dept_id: TEST_DEPT }).del();
    await db('global_course').where({ dept_id: TEST_DEPT }).del();
    await db('global_students').where({ dept_id: TEST_DEPT }).del();
    await db('global_directory').where({ dept_id: TEST_DEPT }).del();
    await db('department').where({ dept_id: TEST_DEPT }).del();
  });

  describe('1. Questions Bulk Upload', () => {
    it('should reject empty or invalid payload', async () => {
      const req = createMockReq('department', TEST_DEPT, { dept_id: TEST_DEPT, questions: [] });
      const res = createMockRes();
      await bulkUploadQuestions(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should successfully bulk upload questions using template format { heading, question }', async () => {
      const req = createMockReq('department', TEST_DEPT, {
        dept_id: TEST_DEPT,
        questions: [
          { heading: 'Teaching Effectiveness', question: 'Clarity of explanations.' },
          { heading: 'Communication Skills', question: 'Articulation and pace.' }
        ]
      });
      const res = createMockRes();
      await bulkUploadQuestions(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.inserted).toBe(2);

      const inDb = await db('global_feedback_questions').where({ dept_id: TEST_DEPT });
      expect(inDb.length).toBe(2);
      expect(inDb[0].question_heading).toBe('Teaching Effectiveness');
      expect(inDb[0].question_text).toBe('Clarity of explanations.');
    });
  });

  describe('2. Faculty Bulk Upload', () => {
    it('should reject invalid payload or missing faculty array', async () => {
      const req = createMockReq('department', TEST_DEPT, { dept_id: TEST_DEPT, faculty: [] });
      const res = createMockRes();
      await bulkUploadFaculty(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should successfully bulk upload faculty and sync to global_directory', async () => {
      const req = createMockReq('department', TEST_DEPT, {
        dept_id: TEST_DEPT,
        faculty: [
          { faculty_id: 'TEST_FAC_001', name: 'Dr. Bulk Test 1', email: 'testfac1@mit.gmail.com' },
          { faculty_id: 'TEST_FAC_002', name: 'Dr. Bulk Test 2', email: 'testfac2@mit.gmail.com' }
        ]
      });
      const res = createMockRes();
      await bulkUploadFaculty(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.inserted).toBe(2);

      const inDb = await db('global_faculty').where({ dept_id: TEST_DEPT });
      expect(inDb.length).toBe(2);

      const inDir = await db('global_directory').where({ dept_id: TEST_DEPT, role: 'faculty' });
      expect(inDir.length).toBe(2);
    });
  });

  describe('3. Courses Bulk Upload', () => {
    it('should reject invalid payload', async () => {
      const req = createMockReq('department', TEST_DEPT, { dept_id: TEST_DEPT, courses: [] });
      const res = createMockRes();
      await bulkUploadCourses(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should successfully bulk upload courses into global_course', async () => {
      const req = createMockReq('department', TEST_DEPT, {
        dept_id: TEST_DEPT,
        courses: [
          { course_code: 'TEST_CS101', course_name: 'Algorithms', sem: 4 },
          { course_code: 'TEST_CS102', course_name: 'Database Systems', sem: 4 }
        ]
      });
      const res = createMockRes();
      await bulkUploadCourses(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.inserted).toBe(2);

      const inDb = await db('global_course').where({ dept_id: TEST_DEPT });
      expect(inDb.length).toBe(2);
      expect(inDb[0].course_name).toBe('Algorithms');
      expect(inDb[0].sem).toBe(4);
    });
  });

  describe('4. Students Bulk Upload', () => {
    it('should reject invalid payload', async () => {
      const req = createMockReq('department', TEST_DEPT, { dept_id: TEST_DEPT, students: [] });
      const res = createMockRes();
      await bulkUploadStudents(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should successfully bulk upload students and sync with global_directory', async () => {
      const req = createMockReq('department', TEST_DEPT, {
        dept_id: TEST_DEPT,
        students: [
          { usn: '1ME21TEST01', name: 'Student One', section: 'A', sem: 4, email: 'stud1@test.com' },
          { usn: '1ME21TEST02', name: 'Student Two', section: 'A', sem: 4, email: 'stud2@test.com' }
        ]
      });
      const res = createMockRes();
      await bulkUploadStudents(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.jsonPayload.inserted).toBe(2);

      const inDb = await db('global_students').where({ dept_id: TEST_DEPT });
      expect(inDb.length).toBe(2);

      const inDir = await db('global_directory').where({ dept_id: TEST_DEPT, role: 'student' });
      expect(inDir.length).toBe(2);
    });
  });
});
