const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { isAdminOrDepartment } = require('../middleware/authMiddleware');

router.get('/courses/by-dept/:dept_id', isAdminOrDepartment, courseController.getCoursesByDept);
router.put('/course/:course_code', isAdminOrDepartment, courseController.updateCourse);
router.delete('/course/:course_code', isAdminOrDepartment, courseController.deleteCourse);
router.post('/courses/bulk', isAdminOrDepartment, courseController.bulkUploadCourses);

module.exports = router;
