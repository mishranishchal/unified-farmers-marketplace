const Order = require('../models/Order');
const Product = require('../models/Product');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { validateOrderTransition, canCancel } = require('../services/orderStateService');
const { notifyOrderStatus } = require('../services/notificationService');

const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return next(new AppError('Order items are required', 400));
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return next(new AppError(`Product not found: ${item.productId}`, 404));
      if (product.quantity < item.quantity) {
        return next(new AppError(`Insufficient quantity for ${product.name}`, 400));
      }

      const qty = Number(item.quantity);
      totalAmount += product.price * qty;

      orderItems.push({
        product: product._id,
        quantity: qty,
        unitPrice: product.price,
        farmer: product.farmer,
      });

      product.quantity -= qty;
      if (product.quantity === 0) product.status = 'sold';
      await product.save();
    }

    const order = await Order.create({
      buyer: req.user._id,
      products: orderItems,
      totalAmount,
      shippingAddress,
    });

    return sendResponse(res, 201, { order }, 'Order created');
  } catch (error) {
    return next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }).populate('products.product').sort({ createdAt: -1 });
    return sendResponse(res, 200, { orders }, 'Orders fetched');
  } catch (error) {
    return next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email')
      .populate('products.product')
      .populate('products.farmer', 'name');

    if (!order) return next(new AppError('Order not found', 404));

    const isBuyer = String(order.buyer._id) === String(req.user._id);
    if (!isBuyer && req.user.role !== 'admin') {
      return next(new AppError('Not allowed to view this order', 403));
    }

    return sendResponse(res, 200, { order }, 'Order fetched');
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('buyer', 'email');
    if (!order) return next(new AppError('Order not found', 404));

    validateOrderTransition(order.orderStatus, status);
    order.orderStatus = status;
    if (status === 'paid') order.paymentStatus = 'paid';

    await order.save();
    await notifyOrderStatus(order.buyer?.email, order._id.toString(), status);

    return sendResponse(res, 200, { order }, 'Order status updated');
  } catch (error) {
    return next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));
    if (String(order.buyer) !== String(req.user._id) && req.user.role !== 'admin') {
      return next(new AppError('Not allowed to cancel this order', 403));
    }

    if (!canCancel(order.orderStatus)) {
      return next(new AppError('Cancellation allowed only before shipped', 400));
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return sendResponse(res, 200, { order }, 'Order cancelled');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
