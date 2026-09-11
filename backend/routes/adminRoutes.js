const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin, isAdminOrDepartment } = require('../middleware/authMiddleware');

router.get('/admin/global-metrics', isAdmin, adminController.getGlobalMetrics);
router.get('/admin/global-faculties', isAdmin, adminController.getGlobalFaculties);
router.get('/admin/global-students', isAdmin, adminController.getGlobalStudents);
router.get('/admin/global-sessions', isAdmin, adminController.getGlobalSessions);
router.get('/admin/department-summaries', isAdmin, adminController.getDepartmentSummaries);
router.patch('/admin/department/:dept_id/status', isAdmin, adminController.toggleDepartmentStatus);
router.post('/admin/department/:dept_id/purge', isAdmin, adminController.purgeDepartmentData);

router.delete('/department/:dept_id/feedback-reset', isAdminOrDepartment, adminController.resetDepartmentFeedback);
router.delete('/department/:dept_id/faculty-reset', isAdminOrDepartment, adminController.resetDepartmentFaculty);
router.put('/department/:dept_id/change-password', isAdminOrDepartment, adminController.changeDepartmentPassword);

router.post('/admin/update-password', isAdmin, adminController.updateAdminPassword);
router.post('/admin/update-username', isAdmin, adminController.updateAdminUsername);
router.get('/admin/audit-logs', isAdmin, adminController.getAdminAuditLogs);

router.get('/logs/department/:dept_id', isAdminOrDepartment, adminController.getDepartmentLogs);

module.exports = router;
