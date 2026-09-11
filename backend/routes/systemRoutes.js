const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { isAdmin, isAdminOrDepartment, isAdminOrDepartmentOrFaculty } = require('../middleware/authMiddleware');

router.get('/departments', systemController.getDepartments);
router.post('/department/add', isAdmin, systemController.addDepartment);

router.post('/add-course', isAdminOrDepartment, systemController.addCourse);
router.get('/get-courses/:dept_id', systemController.getCourses);

router.get('/faculty/by-dept/:dept_id', isAdminOrDepartment, systemController.getFacultyByDept);
router.post('/assign-subject', isAdminOrDepartment, systemController.assignSubject);
router.get('/faculty/:faculty_id/assignments', isAdminOrDepartment, systemController.getFacultyAssignments);
router.get('/faculty/assigned/:faculty_id', isAdminOrDepartment, systemController.getFacultyAssignedSubjects);
router.delete('/faculty/assigned/:faculty_id/:course_code', isAdminOrDepartment, systemController.removeFacultyAssignment);

router.get('/department/notes/:faculty_id', isAdminOrDepartment, systemController.getNotes);
router.post('/department/notes', isAdminOrDepartment, systemController.addNote);

router.get('/faculty/notifications', isAdminOrDepartmentOrFaculty, systemController.getNotifications);
router.post('/faculty/notifications/reply', isAdminOrDepartmentOrFaculty, systemController.addNote);
router.put('/faculty/notifications/:note_id/read', isAdminOrDepartmentOrFaculty, systemController.markNotificationRead);

router.post('/students/bulk', isAdminOrDepartment, systemController.bulkUploadStudents);
router.get('/search/:dept_id', isAdminOrDepartment, systemController.globalSearch);

module.exports = router;
