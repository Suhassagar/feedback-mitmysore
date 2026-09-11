const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { isAdminOrDepartment } = require('../middleware/authMiddleware');

router.post('/create-session', isAdminOrDepartment, sessionController.createSession);
router.get('/get-sessions', isAdminOrDepartment, sessionController.getSessions);
router.put('/end-session/:id', isAdminOrDepartment, sessionController.endSession);
router.delete('/delete-session/:id', isAdminOrDepartment, sessionController.deleteSession);
router.get('/track-session/:session_id', isAdminOrDepartment, sessionController.trackSession);
router.post('/sessions/:session_id/notify', isAdminOrDepartment, sessionController.notifyStudents);

module.exports = router;
