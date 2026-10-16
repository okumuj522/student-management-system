const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, announcementController.getAllAnnouncements);
router.post('/', authenticateToken, authorizeRoles('admin', 'teacher'), announcementController.createAnnouncement);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), announcementController.deleteAnnouncement);

module.exports = router;
