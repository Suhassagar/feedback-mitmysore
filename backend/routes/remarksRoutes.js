const express = require('express');
const router = express.Router();
const remarksController = require('../controllers/remarksController');
const { isAdminOrDepartment } = require('../middleware/authMiddleware');

router.get('/department/remarks/:dept_id', isAdminOrDepartment, remarksController.getRemarks);
router.post('/department/remarks/analyze', isAdminOrDepartment, remarksController.analyzeRemarks);

module.exports = router;
