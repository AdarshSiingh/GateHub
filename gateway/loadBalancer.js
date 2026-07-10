let counter = 0;

function getNextInstance(healthyInstances) {
  if (healthyInstances.length === 0) {
    throw new Error('No healthy instances available');
  }
  const index = counter % healthyInstances.length;
  counter++;
  return healthyInstances[index];
}

module.exports = { getNextInstance };