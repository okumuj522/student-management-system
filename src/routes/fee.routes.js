const express = require('express');
const router = express.Router();
const feeController = require('../controllers/fee.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Both admin and student can view their fee records
router.get('/', authenticateToken, authorizeRoles('admin', 'student'), feeController.getAllFees);

// M-Pesa STK Push SDK payment initiation
router.post('/:id/stk-push', authenticateToken, authorizeRoles('admin', 'student'), feeController.initiateMpesaStkPush);

// Verify manual M-Pesa transaction code
router.post('/:id/verify-code', authenticateToken, authorizeRoles('admin', 'student'), feeController.verifyMpesaCode);

// Get official fee receipt
router.get('/:id/receipt', authenticateToken, authorizeRoles('admin', 'student'), feeController.getFeeReceipt);

// Admin fee management
router.post('/', authenticateToken, authorizeRoles('admin'), feeController.createFee);
router.post('/:id/pay', authenticateToken, authorizeRoles('admin'), feeController.recordPayment);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), feeController.deleteFee);

module.exports = router;
