const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, courseController.getAllCourses);
router.get('/:id', authenticateToken, courseController.getCourseById);
router.post('/', authenticateToken, authorizeRoles('admin'), courseController.createCourse);
router.put('/:id', authenticateToken, authorizeRoles('admin'), courseController.updateCourse);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), courseController.deleteCourse);

// Enrollment actions
router.post('/enroll', authenticateToken, authorizeRoles('admin', 'teacher'), courseController.enrollStudent);
router.post('/unenroll', authenticateToken, authorizeRoles('admin', 'teacher'), courseController.unenrollStudent);

module.exports = router;
