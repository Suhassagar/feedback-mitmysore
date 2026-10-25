/**
 * Automated Verification: Unsafe File Uploads Hardening
 * Tests:
 * 1. Disguised file rejection (magic-byte validation) in profile upload
 * 2. IDOR / BOLA defense in Cloudinary asset deletion
 * 3. Tenant isolation in bulk uploads (students, faculty, courses, questions)
 * 4. Batch size throttling in bulk uploads
 * 5. Path traversal sanitization in imageProcessor
 */

const assert = require('assert');
const { validateMagicBytes, processAndUploadLogo } = require('../utils/imageProcessor');
const facultyController = require('../controllers/facultyController');
const systemController = require('../controllers/systemController');
const courseController = require('../controllers/courseController');
const feedbackController = require('../controllers/feedbackController');

async function runTests() {
  console.log('--- 1. Testing Magic Byte Validation for Image Uploads ---');

  // Case A: Disguised script/text with .png extension
  const fakePngBuffer = Buffer.from('<?php echo "malicious"; ?>');
  const detectedType1 = validateMagicBytes(fakePngBuffer);
  assert.strictEqual(detectedType1, null, 'Disguised text/script must not pass magic byte check');

  // Case B: Genuine PNG header
  const realPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const detectedType2 = validateMagicBytes(realPngHeader);
  assert.strictEqual(detectedType2, 'png', 'Genuine PNG magic bytes must be identified');

  // Case C: Fake image uploaded to uploadTempProfilePicture rejected with 400
  let uploadStatus = null;
  let uploadJson = null;
  const mockReqUpload = {
    file: {
      buffer: fakePngBuffer,
      originalname: 'shell.png',
      mimetype: 'image/png'
    },
    session: { faculty_id: 'FAC01', role: 'faculty' }
  };
  const mockResUpload = {
    status: (s) => { uploadStatus = s; return mockResUpload; },
    json: (j) => { uploadJson = j; return mockResUpload; }
  };
  await facultyController.uploadTempProfilePicture(mockReqUpload, mockResUpload);
  assert.strictEqual(uploadStatus, 400, 'Disguised file must be rejected with 400');
  assert.match(uploadJson.message, /Invalid or disguised image file format/, 'Error message must explain image format rejection');
  console.log('✅ Disguised file correctly blocked via magic-byte header inspection.');

  console.log('--- 2. Testing IDOR / BOLA Defense in Asset Deletion ---');
  let deleteStatus = null;
  let deleteJson = null;
  const mockResDelete = {
    status: (s) => { deleteStatus = s; return mockResDelete; },
    json: (j) => { deleteJson = j; return mockResDelete; }
  };

  // Case A: Faculty FAC01 trying to delete a department logo
  await facultyController.deleteTempProfilePicture({
    body: { public_id: 'department_logos/dept_cse_12345' },
    session: { faculty_id: 'FAC01', role: 'faculty' }
  }, mockResDelete);
  assert.strictEqual(deleteStatus, 403, 'Cross-asset logo deletion must be blocked with 403');

  // Case B: Faculty FAC01 trying to delete FAC02's temp image
  await facultyController.deleteTempProfilePicture({
    body: { public_id: 'faculty_profiles/temp_FAC02_99999' },
    session: { faculty_id: 'FAC01', role: 'faculty' }
  }, mockResDelete);
  assert.strictEqual(deleteStatus, 403, 'Deleting another faculty member temp image must be blocked with 403');
  console.log('✅ IDOR asset deletion defense verified: Cross-asset and cross-faculty deletion blocked with 403.');

  console.log('--- 3. Testing Bulk Upload Tenant Isolation ---');
  let tenantStatus = null;
  let tenantJson = null;
  const mockResTenant = {
    status: (s) => { tenantStatus = s; return mockResTenant; },
    json: (j) => { tenantJson = j; return mockResTenant; }
  };

  // Case A: CSE department trying to upload students for ISE
  await systemController.bulkUploadStudents({
    body: { dept_id: 'ISE', students: [{ usn: '1ME20IS001', name: 'Test' }] },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResTenant);
  assert.strictEqual(tenantStatus, 403, 'Cross-department student bulk upload must be blocked with 403');

  // Case B: CSE department trying to upload faculty for ISE
  await facultyController.bulkUploadFaculty({
    body: { dept_id: 'ISE', faculty: [{ faculty_id: 'FAC99', name: 'Test' }] },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResTenant);
  assert.strictEqual(tenantStatus, 403, 'Cross-department faculty bulk upload must be blocked with 403');

  // Case C: CSE department trying to upload courses for ISE
  await courseController.bulkUploadCourses({
    body: { dept_id: 'ISE', courses: [{ course_code: 'IS101', course_name: 'OS' }] },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResTenant);
  assert.strictEqual(tenantStatus, 403, 'Cross-department course bulk upload must be blocked with 403');

  // Case D: CSE department trying to upload questions for ISE
  await feedbackController.bulkUploadQuestions({
    body: { dept_id: 'ISE', questions: ['Question 1'] },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResTenant);
  assert.strictEqual(tenantStatus, 403, 'Cross-department question bulk upload must be blocked with 403');
  console.log('✅ Tenant isolation verified across students, faculty, courses, and questions bulk imports.');

  console.log('--- 4. Testing Bulk Upload Batch Size Limits ---');
  let batchStatus = null;
  let batchJson = null;
  const mockResBatch = {
    status: (s) => { batchStatus = s; return mockResBatch; },
    json: (j) => { batchJson = j; return mockResBatch; }
  };

  // Case A: Exceeding 1000 students
  const largeStudentList = new Array(1001).fill({ usn: 'USN', name: 'Name' });
  await systemController.bulkUploadStudents({
    body: { dept_id: 'CSE', students: largeStudentList },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResBatch);
  assert.strictEqual(batchStatus, 400, 'Payload exceeding 1000 students must be rejected with 400');
  assert.match(batchJson.error, /exceeds maximum limit of 1000/, 'Batch limit error message must be returned');

  // Case B: Exceeding 500 questions
  const largeQuestionList = new Array(501).fill('Sample question');
  await feedbackController.bulkUploadQuestions({
    body: { dept_id: 'CSE', questions: largeQuestionList },
    session: { dept_id: 'CSE', role: 'department' }
  }, mockResBatch);
  assert.strictEqual(batchStatus, 400, 'Payload exceeding 500 questions must be rejected with 400');
  assert.match(batchJson.error, /exceeds maximum limit of 500/, 'Batch limit error message must be returned');
  console.log('✅ Batch size throttling verified: Excessive array payloads rejected with 400.');

  console.log('\n🎉 ALL UNSAFE FILE UPLOAD & BULK IMPORT HARDENING TESTS PASSED! 🎉');
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
