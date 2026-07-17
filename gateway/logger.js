const stats = require('./stats');

function requestLogger(req, res, next) {
  const isMonitoringRoute = req.path.startsWith('/gateway/');

  if (!isMonitoringRoute) {
    stats.recordRequest();
  }

  const start = Date.now();
  const timestamp = new Date().toLocaleTimeString();
  let counted = false;

  function finalize() {
    if (counted) return;
    counted = true;

    const duration = Date.now() - start;
    const target = req.chosenInstance || 'unknown';

    if (!isMonitoringRoute) {
      if (res.statusCode < 400) {
        stats.recordSuccess();
      } else {
        stats.recordBlocked();
      }
    }

    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} -> ${target} (${res.statusCode}) - ${duration}ms`
    );
  }

  res.on('finish', finalize);
  res.on('close', finalize);

  next();
}

module.exports = requestLogger;