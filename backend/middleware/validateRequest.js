const { ZodError } = require('zod');

const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        data: { issues: error.flatten() },
        message: 'Validation failed',
      });
    }
    next(error);
  }
};

module.exports = validateRequest;
