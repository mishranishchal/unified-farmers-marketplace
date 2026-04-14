const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const sendResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const { notifyPaymentSuccess } = require('../services/notificationService');

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

const createPaymentOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.body.orderId);
    if (!order) return next(new AppError('Order not found', 404));

    if (String(order.buyer) !== String(req.user._id)) {
      return next(new AppError('Not allowed to pay for this order', 403));
    }

    const amountPaise = Math.round(order.totalAmount * 100);

    if (!razorpay) {
      return sendResponse(
        res,
        200,
        {
          razorpayOrder: {
            id: `mock_${order._id}`,
            amount: amountPaise,
            currency: 'INR',
          },
        },
        'Razorpay keys not configured, returned mock order'
      );
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `order_${order._id}`,
      notes: { orderId: order._id.toString() },
    });

    return sendResponse(res, 200, { razorpayOrder }, 'Razorpay order created');
  } catch (error) {
    return next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const order = await Order.findById(orderId).populate('buyer', 'email');
    if (!order) return next(new AppError('Order not found', 404));

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dev-secret')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    order.paymentId = razorpay_payment_id;
    order.paymentStatus = isValid ? 'paid' : 'failed';
    order.orderStatus = isValid ? 'paid' : order.orderStatus;
    await order.save();

    await Transaction.create({
      user: order.buyer._id,
      type: 'debit',
      category: 'order_payment',
      amount: order.totalAmount,
      reference: razorpay_payment_id,
      method: 'upi',
      status: isValid ? 'completed' : 'failed',
      metadata: { orderId: order._id.toString(), gatewayOrderId: razorpay_order_id },
    });

    if (isValid) {
      await notifyPaymentSuccess(order.buyer?.email, order._id.toString(), order.totalAmount);
      return sendResponse(res, 200, { order }, 'Payment verified');
    }

    return next(new AppError('Payment signature mismatch', 400));
  } catch (error) {
    return next(error);
  }
};

const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'dev-webhook')
      .update(body)
      .digest('hex');

    if (signature !== expected) return next(new AppError('Invalid webhook signature', 400));

    const payload = JSON.parse(body.toString());
    if (payload.event === 'payment.captured') {
      const receipt = payload.payload.payment.entity.notes?.orderId;
      if (receipt) {
        const order = await Order.findById(receipt);
        if (order) {
          order.paymentStatus = 'paid';
          if (order.orderStatus === 'created') order.orderStatus = 'paid';
          await order.save();
        }
      }
    }

    return sendResponse(res, 200, {}, 'Webhook processed');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  razorpayWebhook,
};
