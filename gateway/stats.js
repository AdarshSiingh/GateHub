let totalRequests = 0;
let blockedRequests = 0;
let successfulRequests = 0;

function recordRequest() {
  totalRequests++;
}

function recordBlocked() {
  blockedRequests++;
}

function recordSuccess() {
  successfulRequests++;
}

function getStats() {
  return {
    totalRequests,
    successfulRequests,
    blockedRequests,
  };
}

module.exports = { recordRequest, recordBlocked, recordSuccess, getStats };