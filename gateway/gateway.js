const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { startHealthChecks, getHealthyInstances } = require('./healthChecker');
const { getNextInstance } = require('./loadBalancer');
const rateLimiter = require('./rateLimiter');
const requestLogger = require('./logger');
const stats = require('./stats');

const app = express();
app.use(express.static('gateway/public'));

startHealthChecks();

app.use(requestLogger);
app.use(rateLimiter);

function formatUptime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}m ${secs}s`;
}

app.get('/gateway/stats', (req, res) => {
  res.json(stats.getStats());
});

app.get('/gateway/status', (req, res) => {
  res.json({
    healthyInstances: getHealthyInstances(),
    rateLimiterEnabled: true,
    loadBalancer: 'Round Robin',
    uptime: formatUptime(process.uptime()),
  });
});

app.use('/', createProxyMiddleware({
  changeOrigin: true,
  router: (req) => {
    const healthyInstances = getHealthyInstances();
    const chosenInstance = getNextInstance(healthyInstances);
    req.chosenInstance = chosenInstance;
    return chosenInstance;
  },
}));

app.listen(9000, () => {
  console.log('Gateway is running on http://localhost:9000');
});