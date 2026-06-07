const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ganesh_chitfund';
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Don't process.exit() here: on Vercel this file runs inside a serverless function,
    // and exiting kills the whole invocation (FUNCTION_INVOCATION_FAILED) instead of
    // returning a clean error response. Let the caller handle the rejection.
    if (process.env.VERCEL) throw err;
    process.exit(1);
  }
}

module.exports = connectDB;
