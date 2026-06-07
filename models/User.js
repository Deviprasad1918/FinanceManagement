const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'user'], default: 'user' }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  toJSON: toJSONOptions
});

module.exports = mongoose.model('User', userSchema);
