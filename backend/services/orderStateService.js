const AppError = require('../utils/appError');

const ORDER_TRANSITIONS = {
  created: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const validateOrderTransition = (currentStatus, nextStatus) => {
  const allowed = ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(`Invalid order transition: ${currentStatus} -> ${nextStatus}`, 400);
  }
};

const canCancel = (orderStatus) => ['created', 'paid'].includes(orderStatus);

module.exports = {
  ORDER_TRANSITIONS,
  validateOrderTransition,
  canCancel,
};
