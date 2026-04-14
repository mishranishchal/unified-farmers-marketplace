const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { suggestPrice, listPrices } = require('../controllers/priceController');

const router = express.Router();

router.get('/', listPrices);
router.post('/suggest', protect, authorizeRoles('farmer', 'admin'), suggestPrice);

module.exports = router;
