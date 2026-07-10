const express = require('express');

const app = express();


const port = process.env.PORT
  ? parseInt(process.env.PORT)
  : (process.argv[2] ? parseInt(process.argv[2]) : 8081);

app.get('/', (req, res) => {
  res.send(`Hello from Users Service! (running on port ${port})`);
});

app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Users Service is running on http://localhost:${port}`);
});