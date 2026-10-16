const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, attendanceController.getAttendance);
router.get('/sheet', authenticateToken, authorizeRoles('admin', 'teacher'), attendanceController.getClassSheet);
router.post('/batch', authenticateToken, authorizeRoles('admin', 'teacher'), attendanceController.markBatchAttendance);

module.exports = router;
