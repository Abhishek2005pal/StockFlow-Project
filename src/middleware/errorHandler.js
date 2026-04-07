function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Server error";

  // Log full error for server-side visibility
  console.error(err.stack || err);

  res.status(statusCode).json({
    error: true,
    message,
    status: statusCode
  });
}

module.exports = errorHandler;
