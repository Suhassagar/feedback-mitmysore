const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { isAdminOrDepartment } = require('../middleware/authMiddleware');

router.get('/students/:dept_id', isAdminOrDepartment, studentController.getStudents);
router.post('/upload-students', isAdminOrDepartment, studentController.uploadStudents);
router.delete('/students/:usn', isAdminOrDepartment, studentController.deleteStudent);
router.post('/students/bulk-delete', isAdminOrDepartment, studentController.bulkDeleteStudents);

module.exports = router;
