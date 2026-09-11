const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { isAdminOrDepartment, isAdminOrDepartmentOrFaculty } = require('../middleware/authMiddleware');

router.get('/analytics/department/:dept_id', isAdminOrDepartment, analyticsController.getDepartmentAnalytics);
router.get('/faculty-analytics/:faculty_id', isAdminOrDepartmentOrFaculty, analyticsController.getFacultyAnalytics);
router.get('/faculty-analytics/roster/:dept_id/:sem/:section', isAdminOrDepartmentOrFaculty, analyticsController.getStudentRoster);
router.get('/top-faculties', isAdminOrDepartment, analyticsController.getTopFaculties);

module.exports = router;
