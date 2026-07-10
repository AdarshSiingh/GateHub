const axios = require('axios');


const usersInstances = process.env.USERS_INSTANCES
  ? process.env.USERS_INSTANCES.split(',')
  : ['http://localhost:8081', 'http://localhost:8082'];

const healthStatus = {};
usersInstances.forEach((instance) => {
  healthStatus[instance] = true;
});

function startHealthChecks() {
  setInterval(async () => {
    for (const instance of usersInstances) {
      try {
        await axios.get(`${instance}/health`, { timeout: 2000 });
        if (!healthStatus[instance]) {
          console.log(`${instance} is back UP`);
        }
        healthStatus[instance] = true;
      } catch (err) {
        if (healthStatus[instance]) {
          console.log(`${instance} went DOWN`);
        }
        healthStatus[instance] = false;
      }
    }
  }, 5000);
}

function getHealthyInstances() {
  return usersInstances.filter((i) => healthStatus[i]);
}

module.exports = { startHealthChecks, getHealthyInstances };