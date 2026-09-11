// errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  console.error(`[UNHANDLED ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err.stack);

  // Determine status code (default to 500 Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only send stack trace in development mode
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the errorHandler
};

module.exports = {
  errorHandler,
  notFoundHandler
};
