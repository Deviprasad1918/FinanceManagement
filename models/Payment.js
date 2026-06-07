const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const paymentSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', default: null },
  month: { type: Number },
  amount: { type: Number, required: true },
  date: { type: String, default: '' },
  paymentMode: { type: String, default: 'cash' },
  transactionId: { type: String, default: '' },
  remarks: { type: String, default: '' },
  status: { type: String, default: 'completed' }
}, { toJSON: toJSONOptions });

module.exports = mongoose.model('Payment', paymentSchema);
