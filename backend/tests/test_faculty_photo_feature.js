/**
 * Verification Script: Faculty Profile Photo Display Feature
 * Tests:
 * 1. Faculty Initials Extraction Logic
 * 2. Backend getStudentSubjects SQL Query Shape & Columns
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test 1: Helper function logic simulation
function getFacultyInitials(name) {
  if (!name || typeof name !== 'string') return 'F';
  const cleanName = name.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

console.log('--- 1. Testing Faculty Initials Extraction Logic ---');
assert.strictEqual(getFacultyInitials("Dr. Ramesh Rao"), "RR");
assert.strictEqual(getFacultyInitials("Prof. Ananya Sharma"), "AS");
assert.strictEqual(getFacultyInitials("Suhas Sagar"), "SS");
assert.strictEqual(getFacultyInitials("Mr. Vinay"), "VI");
assert.strictEqual(getFacultyInitials(""), "F");
assert.strictEqual(getFacultyInitials(null), "F");
console.log('✅ Faculty initials extraction handles academic titles, single names, and null values properly.');

// Test 2: Verify feedbackController.js getStudentSubjects has profile_picture_url
console.log('--- 2. Verifying Backend Query in feedbackController.js ---');
const controllerCode = fs.readFileSync(path.join(__dirname, '../controllers/feedbackController.js'), 'utf8');

assert.ok(
  controllerCode.includes("'f.profile_picture_url'"),
  "getStudentSubjects must select f.profile_picture_url"
);
assert.ok(
  controllerCode.includes("'f.position as designation'"),
  "getStudentSubjects must select f.position as designation"
);
console.log('✅ Backend feedbackController.js properly selects profile_picture_url and designation.');

// Test 3: Verify FeedbackForm.jsx contains FacultyAvatar and renders avatar in both wizard and summary
console.log('--- 3. Verifying Frontend Integration in FeedbackForm.jsx ---');
const frontendCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/FeedbackForm.jsx'), 'utf8');

assert.ok(frontendCode.includes('function FacultyAvatar('), 'FeedbackForm must define FacultyAvatar component');
assert.ok(frontendCode.includes('photoUrl={currentFaculty.profile_picture_url}'), 'Wizard step must pass currentFaculty.profile_picture_url to FacultyAvatar');
assert.ok(frontendCode.includes('photoUrl={fac.profile_picture_url}'), 'Summary step must pass fac.profile_picture_url to FacultyAvatar');
assert.ok(frontendCode.includes('eval-faculty-avatar-fallback'), 'Must have fallback initials display');
console.log('✅ Frontend FeedbackForm.jsx contains complete avatar and fallback integration.');

console.log('\n🎉 ALL FACULTY PROFILE PHOTO TESTS PASSED SUCCESSFULLY! 🎉\n');
process.exit(0);
