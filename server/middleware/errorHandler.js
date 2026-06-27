/**
 * Global Express error handler.
 * Catches all errors passed via next(err).
 */
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
