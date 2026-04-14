const User = require('../models/User');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { extractMockOcrFields } = require('../services/kycService');

const uploadKyc = async (req, res, next) => {
  try {
    if (req.user.role !== 'farmer') return next(new AppError('Only farmers can upload KYC', 403));

    const kycDocumentUrl = req.body.kycDocumentUrl || '';
    const ocr = extractMockOcrFields(req.body.ocrText || '');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        kycDocumentUrl,
        isVerified: false,
      },
      { new: true }
    ).select('-password');

    return sendResponse(res, 200, { user, ocr }, 'KYC uploaded for review');
  } catch (error) {
    return next(error);
  }
};

const reviewKyc = async (req, res, next) => {
  try {
    const { userId, approved } = req.body;
    const user = await User.findById(userId);
    if (!user) return next(new AppError('User not found', 404));

    user.isVerified = Boolean(approved);
    await user.save();

    return sendResponse(
      res,
      200,
      { user: { id: user._id, isVerified: user.isVerified } },
      approved ? 'Farmer verified' : 'KYC rejected'
    );
  } catch (error) {
    return next(error);
  }
};

const getPendingKyc = async (_req, res, next) => {
  try {
    const users = await User.find({ role: 'farmer', kycDocumentUrl: { $ne: '' }, isVerified: false }).select(
      'name email kycDocumentUrl createdAt'
    );
    return sendResponse(res, 200, { users }, 'Pending KYC records fetched');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  uploadKyc,
  reviewKyc,
  getPendingKyc,
};
