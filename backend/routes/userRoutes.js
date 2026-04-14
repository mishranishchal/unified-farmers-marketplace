const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getUsers,
  getProfile,
  updateProfile,
  getWallet,
  addWalletFunds,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', protect, authorizeRoles('admin'), getUsers);
router.get('/me', protect, getProfile);
router.patch('/me', protect, updateProfile);
router.get('/wallet', protect, getWallet);
router.post('/wallet/topup', protect, addWalletFunds);

module.exports = router;
