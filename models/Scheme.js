const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const schemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  months: { type: Number, default: 20 },
  totalMembers: { type: Number, default: 20 },
  monthlyPayment: { type: Number, required: true },
  baseAmount: { type: Number, required: true },
  startDate: { type: String, default: '' },
  status: { type: String, default: 'active' }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
  toJSON: toJSONOptions
});

module.exports = mongoose.model('Scheme', schemeSchema);
