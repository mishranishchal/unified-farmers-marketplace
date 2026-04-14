const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const sendResponse = require('../utils/apiResponse');

const getAnalytics = async (req, res, next) => {
  try {
    const [
      totalRevenue,
      activeUsers,
      ordersPerDay,
      farmerEarnings,
      topProducts,
      subscriptions,
      commission,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.farmer',
            earnings: { $sum: { $multiply: ['$products.unitPrice', '$products.quantity'] } },
          },
        },
        { $sort: { earnings: -1 } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.product',
            soldQty: { $sum: '$products.quantity' },
          },
        },
        { $sort: { soldQty: -1 } },
        { $limit: 10 },
      ]),
      User.aggregate([
        { $group: { _id: '$subscriptionStatus', total: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: null,
            gross: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const gross = commission[0]?.gross || 0;
    const commissionCollected = Number(
      (gross * Number(process.env.PLATFORM_COMMISSION_RATE || 0.025)).toFixed(2)
    );

    const topProductIds = topProducts.map((p) => p._id);
    const topProductDocs = await Product.find({ _id: { $in: topProductIds } }).select('name');
    const topProductNameMap = new Map(topProductDocs.map((p) => [String(p._id), p.name]));

    return sendResponse(
      res,
      200,
      {
        totalRevenue: totalRevenue[0]?.total || 0,
        activeUsers,
        ordersPerDay,
        farmerEarnings,
        topProducts: topProducts.map((p) => ({
          productId: p._id,
          name: topProductNameMap.get(String(p._id)) || 'Unknown',
          soldQty: p.soldQty,
        })),
        subscriptionMetrics: subscriptions,
        commissionCollected,
      },
      'Admin analytics fetched'
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAnalytics };
