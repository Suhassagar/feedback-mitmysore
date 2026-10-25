const { getFacultyAnalytics } = require('../controllers/analyticsController');
const { getDepartmentLogs, resetDepartmentFeedback, resetDepartmentFaculty } = require('../controllers/adminController');

console.log('--- 1. Testing Faculty BOLA Defense in getFacultyAnalytics ---');
// Test 1a: Faculty querying another faculty's analytics
let statusCode = null;
let responsePayload = null;
const mockRes = {
  status(code) { statusCode = code; return this; },
  json(data) { responsePayload = data; return this; }
};

const reqFacultyA = {
  params: { faculty_id: 'FAC_CS_999' },
  query: {},
  session: { role: 'faculty', faculty_id: 'FAC_CS_101', dept_id: 'CSE' }
};

getFacultyAnalytics(reqFacultyA, mockRes);
if (statusCode !== 403 || !responsePayload.error.includes('strictly authorized to view your own performance')) {
  throw new Error('Faculty BOLA check failed! Expected 403, got: ' + statusCode);
}
console.log('✅ Faculty BOLA defense verified: Cross-faculty analytics blocked with 403.');

console.log('--- 2. Testing Department Tenant Isolation in getDepartmentLogs ---');
let logsStatus = null;
let logsPayload = null;
const mockLogsRes = {
  status(code) { logsStatus = code; return this; },
  json(data) { logsPayload = data; return this; }
};

const reqDeptHOD = {
  params: { dept_id: 'ME' },
  query: {},
  session: { role: 'department', dept_id: 'CSE' }
};

getDepartmentLogs(reqDeptHOD, mockLogsRes);
if (logsStatus !== 403 || !logsPayload.error.includes('Cross-department log access is strictly prohibited')) {
  throw new Error('Department log tenant check failed! Expected 403, got: ' + logsStatus);
}
console.log('✅ Department log tenant isolation verified: Cross-department log access blocked with 403.');

console.log('--- 3. Testing Department Data Reset Isolation ---');
let resetStatus = null;
let resetPayload = null;
const mockResetRes = {
  status(code) { resetStatus = code; return this; },
  json(data) { resetPayload = data; return this; }
};

resetDepartmentFeedback(reqDeptHOD, mockResetRes);
if (resetStatus !== 403 || !resetPayload.error.includes('cannot reset feedback data for another department')) {
  throw new Error('Department reset tenant check failed! Expected 403, got: ' + resetStatus);
}
console.log('✅ Department feedback reset tenant isolation verified: Cross-department wipe blocked with 403.');

console.log('\n🎉 ALL SENSITIVE DATA EXPOSURE HARDENING TESTS PASSED! 🎉');
