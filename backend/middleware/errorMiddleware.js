const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  logger.error('API error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    data: {},
    message: err.isOperational ? err.message : 'Internal server error',
  });
};

module.exports = errorHandler;
