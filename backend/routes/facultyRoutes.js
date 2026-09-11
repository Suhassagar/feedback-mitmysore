const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { isAdminOrDepartment, isFaculty } = require('../middleware/authMiddleware');

router.post('/add', isAdminOrDepartment, facultyController.addFaculty);
router.post('/register', facultyController.registerFaculty);
router.get('/pending/:dept_id', isAdminOrDepartment, facultyController.getPendingRegistrations);
router.post('/approve', isAdminOrDepartment, facultyController.approveFaculty);
router.post('/reject', isAdminOrDepartment, facultyController.rejectFaculty);
router.put('/profile/update', isFaculty, facultyController.updateOwnProfile);
router.put('/:faculty_id', isAdminOrDepartment, facultyController.updateFaculty);
router.delete('/:faculty_id', isAdminOrDepartment, facultyController.deleteFaculty);
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/bulk', isAdminOrDepartment, facultyController.bulkUploadFaculty);
router.post('/profile/upload-temp', isFaculty, upload.single('image'), facultyController.uploadTempProfilePicture);
router.post('/profile/save', isFaculty, facultyController.saveProfilePicture);
router.post('/profile/cleanup', isFaculty, facultyController.deleteTempProfilePicture);

module.exports = router;
