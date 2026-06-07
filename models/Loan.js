const mongoose = require('mongoose');
const toJSONOptions = require('./toJSONPlugin');

const loanSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', default: null },
  principal: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  duration: { type: Number, required: true },
  totalInterest: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  disbursalDate: { type: String, default: '' }
}, { toJSON: toJSONOptions });

module.exports = mongoose.model('Loan', loanSchema);
