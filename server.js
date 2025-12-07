// server.js
require('dotenv').config();     // <= note the () here

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Piazza API listening on port ${PORT}`);
});
