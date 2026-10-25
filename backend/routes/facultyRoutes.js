const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { isAdminOrDepartment, isFaculty } = require('../middleware/authMiddleware');
const { registrationLimiter, profileUploadLimiter } = require('../middleware/rateLimiter');

router.post('/add', isAdminOrDepartment, facultyController.addFaculty);
router.post('/register', registrationLimiter, facultyController.registerFaculty);
router.get('/pending/:dept_id', isAdminOrDepartment, facultyController.getPendingRegistrations);
router.post('/approve', isAdminOrDepartment, facultyController.approveFaculty);
router.post('/reject', isAdminOrDepartment, facultyController.rejectFaculty);
router.put('/profile/update', isFaculty, facultyController.updateOwnProfile);
router.put('/:faculty_id', isAdminOrDepartment, facultyController.updateFaculty);
router.delete('/:faculty_id', isAdminOrDepartment, facultyController.deleteFaculty);
const path = require('path');
const multer = require('multer');

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedImageMimes.includes(file.mimetype) && allowedImageExts.includes(ext)) {
      return cb(null, true);
    }
    const err = new Error('Invalid image file type. Only JPEG, PNG, WEBP, and GIF are allowed.');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  }
});

router.post('/bulk', isAdminOrDepartment, facultyController.bulkUploadFaculty);
router.post('/profile/upload-temp', isFaculty, profileUploadLimiter, upload.single('image'), facultyController.uploadTempProfilePicture);
router.post('/profile/save', isFaculty, facultyController.saveProfilePicture);
router.post('/profile/cleanup', isFaculty, facultyController.deleteTempProfilePicture);

module.exports = router;
