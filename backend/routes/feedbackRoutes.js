const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { isAdminOrDepartment, isAdminOrDepartmentOrFaculty } = require('../middleware/authMiddleware');

router.get('/feedback/token', feedbackController.generateToken);
router.get('/student/subjects/:session_id', feedbackController.getStudentSubjects);
router.post('/submit-feedback', feedbackController.submitFeedback);

router.get('/questions/:dept_id', feedbackController.getQuestions);
router.get('/student/questions/:session_id', feedbackController.getStudentQuestions);

router.post('/department/questions', isAdminOrDepartment, feedbackController.addQuestion);
router.post('/department/questions/bulk', isAdminOrDepartment, feedbackController.bulkUploadQuestions);
router.put('/department/questions/:id', isAdminOrDepartment, feedbackController.updateQuestion);
router.delete('/department/questions/:id', isAdminOrDepartment, feedbackController.deleteQuestion);

router.get('/feedback/subjects_with_avg/:faculty_id', isAdminOrDepartmentOrFaculty, feedbackController.getSubjectsWithAvg);
router.get('/feedback/questions_avg/:faculty_id/:course_id', isAdminOrDepartmentOrFaculty, feedbackController.getQuestionsAvg);

module.exports = router;
