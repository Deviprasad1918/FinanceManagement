const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: String, default: '' }
}, { toJSON: toJSONOptions });

module.exports = mongoose.model('Group', groupSchema);
