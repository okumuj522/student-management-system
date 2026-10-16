const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, teacherController.getAllTeachers);
router.get('/:id', authenticateToken, teacherController.getTeacherById);
router.post('/', authenticateToken, authorizeRoles('admin'), teacherController.createTeacher);
router.put('/:id', authenticateToken, authorizeRoles('admin'), teacherController.updateTeacher);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), teacherController.deleteTeacher);

module.exports = router;
