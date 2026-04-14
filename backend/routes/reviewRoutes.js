const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createReview, getProductReviews } = require('../controllers/reviewController');

const router = express.Router();

router.post('/', protect, authorizeRoles('buyer', 'admin'), createReview);
router.get('/product/:productId', getProductReviews);

module.exports = router;
