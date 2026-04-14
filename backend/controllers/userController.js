const User = require('../models/User');
const Transaction = require('../models/Transaction');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    return sendResponse(res, 200, { users }, 'Users fetched');
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res) => sendResponse(res, 200, { user: req.user }, 'Profile fetched');

const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'address'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    return sendResponse(res, 200, { user }, 'Profile updated');
  } catch (error) {
    return next(error);
  }
};

const getWallet = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(25);
    return sendResponse(
      res,
      200,
      { walletBalance: req.user.walletBalance, transactions },
      'Wallet details fetched'
    );
  } catch (error) {
    return next(error);
  }
};

const addWalletFunds = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount || 0);
    if (amount <= 0) return next(new AppError('Amount must be positive', 400));

    const user = await User.findById(req.user._id);
    user.walletBalance += amount;
    await user.save();

    const tx = await Transaction.create({
      user: user._id,
      type: 'credit',
      category: 'wallet_topup',
      amount,
      reference: `wallet-topup-${Date.now()}`,
      method: 'wallet',
      status: 'completed',
    });

    return sendResponse(res, 200, { walletBalance: user.walletBalance, transaction: tx }, 'Wallet credited');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  getProfile,
  updateProfile,
  getWallet,
  addWalletFunds,
};
