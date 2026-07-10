const stats = require('./stats');

function requestLogger(req, res, next) {
  stats.recordRequest();
  const start = Date.now();
  const timestamp = new Date().toLocaleTimeString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const target = req.chosenInstance || 'unknown';

    if (res.statusCode < 400) {
      stats.recordSuccess();
    }

    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${target} (${res.statusCode}) - ${duration}ms`
    );
  });

  next();
}

module.exports = requestLogger;