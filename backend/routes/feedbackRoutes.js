const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { isAdminOrDepartment, isAdminOrDepartmentOrFaculty, isStudent } = require('../middleware/authMiddleware');
const { sensitiveLimiter, feedbackSubmissionLimiter } = require('../middleware/rateLimiter');

router.get('/feedback/token', isStudent, feedbackController.generateToken);
router.get('/feedback/timing/:session_id', isStudent, feedbackController.getFeedbackTiming);
router.get('/student/subjects/:session_id', isStudent, feedbackController.getStudentSubjects);
router.post('/submit-feedback', isStudent, feedbackSubmissionLimiter, feedbackController.submitFeedback);

router.get('/questions/:dept_id', isAdminOrDepartment, feedbackController.getQuestions);
router.get('/student/questions/:session_id', isStudent, feedbackController.getStudentQuestions);

router.post('/department/questions', isAdminOrDepartment, sensitiveLimiter, feedbackController.addQuestion);
router.post('/department/questions/bulk', isAdminOrDepartment, sensitiveLimiter, feedbackController.bulkUploadQuestions);
router.put('/department/questions/:id', isAdminOrDepartment, sensitiveLimiter, feedbackController.updateQuestion);
router.delete('/department/questions/:id', isAdminOrDepartment, sensitiveLimiter, feedbackController.deleteQuestion);

router.get('/feedback/subjects_with_avg/:faculty_id', isAdminOrDepartmentOrFaculty, feedbackController.getSubjectsWithAvg);
router.get('/feedback/questions_avg/:faculty_id/:course_id', isAdminOrDepartmentOrFaculty, feedbackController.getQuestionsAvg);

module.exports = router;
