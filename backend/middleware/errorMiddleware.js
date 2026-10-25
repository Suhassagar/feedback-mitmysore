// errorMiddleware.js

const errorHandler = (err, req, res, next) => {
  console.error(`[UNHANDLED ERROR] ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err);

  // Handle Multer upload errors gracefully
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File size exceeds maximum allowed limit.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Determine status code (default to 500 Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, sanitize 500-level internal errors to prevent leaking database internals, credentials, or SQL syntax
  let safeMessage = err.message || "Internal Server Error";
  if (isProduction && statusCode >= 500) {
    const isDbOrSystemError = err.sql || err.code || /ECONNREFUSED|ER_|Table .* doesn't exist|Access denied|syntax error/i.test(err.message || '');
    if (isDbOrSystemError) {
      safeMessage = "An unexpected server error occurred. Please contact the administrator.";
    }
  }

  const responsePayload = {
    success: false,
    message: safeMessage,
  };

  // Only expose stack trace in non-production environments
  if (!isProduction && err.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
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
