const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { isAdmin, isAdminOrDepartment, isAdminOrDepartmentOrFaculty } = require('../middleware/authMiddleware');
const path = require('path');
const multer = require('multer');

const allowedLogoMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedLogoExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedLogoMimes.includes(file.mimetype) && allowedLogoExts.includes(ext)) {
      return cb(null, true);
    }
    const err = new Error('Invalid image file type. Only JPEG, PNG, WEBP, and GIF are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
});

router.get('/departments', systemController.getDepartments);
router.post('/department/add', isAdmin, upload.single('logo'), systemController.addDepartment);
router.post('/department/:dept_id/logo', isAdminOrDepartment, upload.single('logo'), systemController.updateDepartmentLogo);

router.post('/add-course', isAdminOrDepartment, systemController.addCourse);
router.get('/get-courses/:dept_id', isAdminOrDepartment, systemController.getCourses);

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

router.get('/department/timing/:dept_id', isAdminOrDepartment, systemController.getDepartmentTiming);
router.put('/department/timing/:dept_id', isAdminOrDepartment, systemController.updateDepartmentTiming);

module.exports = router;
