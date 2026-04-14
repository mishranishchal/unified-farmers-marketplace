const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', protect, authorizeRoles('buyer', 'admin'), createOrder);
router.get('/my', protect, authorizeRoles('buyer', 'admin'), getMyOrders);
router.get('/:id', protect, getOrderById);
router.patch('/:id/status', protect, authorizeRoles('admin'), updateOrderStatus);
router.patch('/:id/cancel', protect, cancelOrder);

module.exports = router;
