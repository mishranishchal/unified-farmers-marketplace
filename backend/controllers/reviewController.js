const Review = require('../models/Review');
const sendResponse = require('../utils/apiResponse');

const createReview = async (req, res, next) => {
  try {
    const review = await Review.create({
      product: req.body.product,
      buyer: req.user._id,
      rating: req.body.rating,
      comment: req.body.comment,
    });

    return sendResponse(res, 201, { review }, 'Review created');
  } catch (error) {
    return next(error);
  }
};

const getProductReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('buyer', 'name')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, { reviews }, 'Reviews fetched');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createReview,
  getProductReviews,
};
