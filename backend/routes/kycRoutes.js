const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadKyc, reviewKyc, getPendingKyc } = require('../controllers/kycController');

const router = express.Router();

router.post('/upload', protect, authorizeRoles('farmer'), uploadKyc);
router.get('/pending', protect, authorizeRoles('admin'), getPendingKyc);
router.post('/review', protect, authorizeRoles('admin'), reviewKyc);

module.exports = router;
