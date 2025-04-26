import logger from '../utils/logger.js';

// Not Found Error Handler
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error details
  logger.error(`API Error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    statusCode,
    errorStack: process.env.NODE_ENV === 'development' ? err.stack : 'Hidden in production'
  });
  
  res.status(statusCode).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : '🥞'
  });
};

// Response Handler
export const responseHandler = (req, res, next) => {
  // Add a success response method
  res.success = (data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      ...data
    });
  };

  // Add an error response method
  res.fail = (message, statusCode = 400, error = null) => {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: error
    });
  };

  next();
};