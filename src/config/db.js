// import mongoose library
const mongoose = require('mongoose');

// Using async function to connect to the MongoDB and also using the try-catch block to handle errors
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;



