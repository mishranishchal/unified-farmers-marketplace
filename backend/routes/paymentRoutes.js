const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', protect, authorizeRoles('buyer', 'admin'), createPaymentOrder);
router.post('/verify', protect, authorizeRoles('buyer', 'admin'), verifyPayment);

module.exports = router;
