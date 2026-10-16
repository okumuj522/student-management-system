const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Self profile for logged in student
router.get('/me', authenticateToken, authorizeRoles('student'), studentController.getMyStudentProfile);

// Admin & Teacher can view all students
router.get('/', authenticateToken, authorizeRoles('admin', 'teacher'), studentController.getAllStudents);

// View specific student
router.get('/:id', authenticateToken, studentController.getStudentById);

// Create student: admin only
router.post('/', authenticateToken, authorizeRoles('admin'), studentController.createStudent);

// Update student: admin & teacher
router.put('/:id', authenticateToken, authorizeRoles('admin', 'teacher'), studentController.updateStudent);

// Delete student: admin only
router.delete('/:id', authenticateToken, authorizeRoles('admin'), studentController.deleteStudent);

module.exports = router;
