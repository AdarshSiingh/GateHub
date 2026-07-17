const stats = require('./stats');

const REQUEST_LIMIT = 5;
const WINDOW_MS = 10000;

const requestCounts = {};

setInterval(() => {
  for (const ip in requestCounts) {
    requestCounts[ip] = 0;
  }
}, WINDOW_MS);

function rateLimiter(req, res, next) {

  if (req.path.startsWith('/gateway/')) {
    return next();
  }
  
  const ip = req.ip;

  if (!requestCounts[ip]) {
    requestCounts[ip] = 0;
  }
  requestCounts[ip]++;

  if (requestCounts[ip] > REQUEST_LIMIT) {
    return res.status(429).send('Too Many Requests - slow down');
  }

  next();
}

module.exports = rateLimiter;