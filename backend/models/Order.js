const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const ORDER_TRANSITIONS = {
  created: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentId: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    orderStatus: {
      type: String,
      enum: ['created', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'created',
    },
    shippingAddress: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

orderSchema.methods.canTransitionTo = function canTransitionTo(nextStatus) {
  return ORDER_TRANSITIONS[this.orderStatus].includes(nextStatus);
};

orderSchema.methods.transitionTo = function transitionTo(nextStatus) {
  if (!this.canTransitionTo(nextStatus)) {
    throw new AppError(`Invalid order transition: ${this.orderStatus} -> ${nextStatus}`, 400);
  }
  this.orderStatus = nextStatus;
  if (nextStatus === 'paid') this.paymentStatus = 'paid';
};

orderSchema.statics.ORDER_TRANSITIONS = ORDER_TRANSITIONS;

module.exports = mongoose.model('Order', orderSchema);
