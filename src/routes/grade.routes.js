const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, gradeController.getGrades);
router.post('/', authenticateToken, authorizeRoles('admin', 'teacher'), gradeController.upsertGrade);
router.get('/transcript/:studentId', authenticateToken, gradeController.getTranscript);

module.exports = router;
