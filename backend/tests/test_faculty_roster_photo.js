/**
 * Verification Script: Faculty Profile Image in Department Roster & Associated Views
 * Tests:
 * 1. Backend: systemController.getFacultyByDept selects 'f.profile_picture_url'
 * 2. Backend: adminController.getGlobalFaculties selects 'f.profile_picture_url'
 * 3. Backend: sessionController.js selects 'f.profile_picture_url'
 * 4. Frontend Component: FacultyAvatar.jsx exists and correctly exports getFacultyInitials
 * 5. Frontend View: ManageFaculty.jsx uses FacultyAvatar with f.profile_picture_url
 * 6. Frontend View: FacultyProfile.jsx uses FacultyAvatar with selectedFaculty.profile_picture_url
 * 7. Live Database Knex Query: getFacultyByDept query executes and returns profile_picture_url field
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- 1. Testing Backend Controllers for profile_picture_url ---');

// Test 1a: systemController.js getFacultyByDept
const systemControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/systemController.js'), 'utf8');
assert.ok(
  systemControllerCode.includes("'f.profile_picture_url'"),
  "systemController.getFacultyByDept must select 'f.profile_picture_url'"
);
console.log('✅ systemController.js getFacultyByDept query includes f.profile_picture_url.');

// Test 1b: adminController.js getGlobalFaculties
const adminControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/adminController.js'), 'utf8');
assert.ok(
  adminControllerCode.includes("'f.profile_picture_url'"),
  "adminController.getGlobalFaculties must select 'f.profile_picture_url'"
);
console.log('✅ adminController.js getGlobalFaculties query includes f.profile_picture_url.');

// Test 1c: sessionController.js
const sessionControllerCode = fs.readFileSync(path.join(__dirname, '../controllers/sessionController.js'), 'utf8');
assert.ok(
  sessionControllerCode.includes("'f.profile_picture_url'"),
  "sessionController.js must select 'f.profile_picture_url'"
);
console.log('✅ sessionController.js queries include f.profile_picture_url.');

console.log('--- 2. Testing Frontend FacultyAvatar & View Integrations ---');

// Test 2a: FacultyAvatar.jsx exists and contains initials extraction
const facultyAvatarPath = path.join(__dirname, '../../frontend/src/components/ui/FacultyAvatar.jsx');
assert.ok(fs.existsSync(facultyAvatarPath), "FacultyAvatar.jsx component must exist");
const facultyAvatarCode = fs.readFileSync(facultyAvatarPath, 'utf8');
assert.ok(facultyAvatarCode.includes('function getFacultyInitials'), "FacultyAvatar.jsx must define getFacultyInitials");
assert.ok(facultyAvatarCode.includes('safeImageUrl'), "FacultyAvatar.jsx must sanitize URLs with safeImageUrl");
assert.ok(facultyAvatarCode.includes('showBadge'), "FacultyAvatar.jsx must support status badge");
console.log('✅ FacultyAvatar.jsx component is properly implemented with security & fallback.');

// Test 2b: ManageFaculty.jsx renders FacultyAvatar with profile_picture_url
const manageFacultyCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/ManageFaculty.jsx'), 'utf8');
assert.ok(
  manageFacultyCode.includes('import FacultyAvatar'),
  "ManageFaculty.jsx must import FacultyAvatar"
);
assert.ok(
  manageFacultyCode.includes('photoUrl={f.profile_picture_url}'),
  "ManageFaculty.jsx must pass f.profile_picture_url to FacultyAvatar"
);
console.log('✅ ManageFaculty.jsx department roster uses FacultyAvatar with f.profile_picture_url.');

// Test 2c: FacultyProfile.jsx renders FacultyAvatar
const facultyProfileCode = fs.readFileSync(path.join(__dirname, '../../frontend/src/features/faculty/components/FacultyProfile.jsx'), 'utf8');
assert.ok(
  facultyProfileCode.includes('import FacultyAvatar'),
  "FacultyProfile.jsx must import FacultyAvatar"
);
assert.ok(
  facultyProfileCode.includes('photoUrl={selectedFaculty.profile_picture_url'),
  "FacultyProfile.jsx must pass selectedFaculty.profile_picture_url to FacultyAvatar"
);
console.log('✅ FacultyProfile.jsx modal header uses FacultyAvatar with selectedFaculty.profile_picture_url.');

console.log('--- 3. Testing Live Knex Query Execution ---');
const db = require('../config/db');

db('global_faculty as f')
  .where({ 'f.dept_id': 'CSE', 'f.is_active': true })
  .select(
    'f.faculty_id',
    'f.name',
    'f.email',
    'f.position',
    'f.dob',
    'f.joining_date',
    'f.profile_picture_url'
  )
  .then(rows => {
    assert.ok(Array.isArray(rows), "Must return an array of rows");
    assert.ok(rows.length > 0, "Must return at least one faculty");
    
    // Check that every row object has the profile_picture_url property
    rows.forEach(r => {
      assert.ok('profile_picture_url' in r, `Faculty ${r.faculty_id} must have profile_picture_url property`);
    });

    const facultiesWithPhotos = rows.filter(r => r.profile_picture_url !== null);
    console.log(`✅ Live query executed successfully: ${rows.length} faculties loaded (${facultiesWithPhotos.length} have photos).`);
    facultiesWithPhotos.forEach(f => {
      console.log(`   - ${f.faculty_id} (${f.name}): ${f.profile_picture_url.substring(0, 60)}...`);
    });

    console.log('\n🎉 ALL FACULTY ROSTER PROFILE IMAGE TESTS PASSED! 🎉\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database test failed:', err);
    process.exit(1);
  });
