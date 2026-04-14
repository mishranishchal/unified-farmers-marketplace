const sendResponse = (res, statusCode, data = {}, message = '') => {
  return res.status(statusCode).json({
    success: statusCode < 400,
    data,
    message,
  });
};

module.exports = sendResponse;
