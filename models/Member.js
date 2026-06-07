const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const memberSchema = new mongoose.Schema({
  schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', default: null },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  paidMonths: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  taken: { type: Boolean, default: false },
  takenMonth: { type: Number, default: null },
  chitAmountReceived: { type: Number, default: null },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  interestPaid: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  joinDate: { type: String, default: '' }
}, { toJSON: toJSONOptions });

module.exports = mongoose.model('Member', memberSchema);
