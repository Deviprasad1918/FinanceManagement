const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const connectDB = require('./config/db');
const User = require('./models/User');
const Scheme = require('./models/Scheme');
const Member = require('./models/Member');
const Payment = require('./models/Payment');
const Loan = require('./models/Loan');
const Group = require('./models/Group');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'ganesh_chitfund_secret_key_2025';

// Comma-separated list of allowed frontend origins, e.g. "https://your-app.vercel.app,https://your-domain.com"
// If FRONTEND_URL is not set, all origins are allowed (safe here since auth uses Bearer tokens, not cookies).
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serverless platforms (Vercel) import this file per-request instead of running a long-lived
// process, so the DB connection is established lazily and cached across invocations.
let dbReady;
function ensureDB() {
  if (!dbReady) {
    dbReady = connectDB().then(() => seedDemoData());
  }
  return dbReady;
}

if (process.env.VERCEL) {
  app.use((req, res, next) => {
    ensureDB().then(() => next()).catch(next);
  });
}

// ===== SEED DEMO DATA (runs once if database is empty) =====
async function seedDemoData() {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;
  console.log('Seeding demo data...');

  await User.create([
    {
      username: 'admin', email: 'admin@ganapathi.com',
      password: bcrypt.hashSync('admin123', 10), name: 'Admin User', role: 'admin'
    },
    {
      username: 'manager', email: 'manager@ganapathi.com',
      password: bcrypt.hashSync('manager123', 10), name: 'Manager User', role: 'manager'
    }
  ]);

  const scheme = await Scheme.create({
    name: 'Ganesh Scheme 2025', months: 20, totalMembers: 20,
    monthlyPayment: 5000, baseAmount: 100000, startDate: '2025-04-24', status: 'active'
  });

  const demoMembers = [
    { name: 'Rajesh', phone: '9876543210', email: 'rajesh@example.com', paidMonths: 20, totalPaid: 100000, taken: true, takenMonth: 3, chitAmountReceived: 100000, interestPaid: 0 },
    { name: 'Priya', phone: '9876543211', email: 'priya@example.com', paidMonths: 15, totalPaid: 75000, taken: false, takenMonth: null, chitAmountReceived: null, interestPaid: 0 },
    { name: 'Arjun', phone: '9876543212', email: 'arjun@example.com', paidMonths: 20, totalPaid: 101000, taken: true, takenMonth: 6, chitAmountReceived: 102000, interestPaid: 1000 },
    { name: 'Vikram', phone: '9876543213', email: 'vikram@example.com', paidMonths: 18, totalPaid: 90000, taken: false, takenMonth: null, chitAmountReceived: null, interestPaid: 0 },
    { name: 'Ravi', phone: '9876543214', email: 'ravi@example.com', paidMonths: 17, totalPaid: 85000, taken: false, takenMonth: null, chitAmountReceived: null, interestPaid: 0 }
  ];

  await Member.create(demoMembers.map((m, i) => ({
    schemeId: scheme._id, name: m.name, phone: m.phone, email: m.email,
    address: `${i + 1}23 Main Street`, paidMonths: m.paidMonths, totalPaid: m.totalPaid,
    taken: m.taken, takenMonth: m.takenMonth, chitAmountReceived: m.chitAmountReceived,
    groupId: null, interestPaid: m.interestPaid,
    status: m.paidMonths >= 20 ? 'completed' : 'active', joinDate: '2025-04-24'
  })));

  console.log('Demo data seeded successfully');
}

// ===== AUTH MIDDLEWARE =====
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Wraps async route handlers so rejected promises reach the error handler
const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Validates :id route params before they reach Mongoose (invalid ObjectId throws CastError otherwise)
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({ success: false, message: `Invalid ${paramName}` });
    }
    next();
  };
}

// ===== HEALTH CHECK =====
app.get('/api', (req, res) => {
  res.json({ success: true, message: 'Ganesh Chitfund API is running', version: '1.0.0' });
});

// ===== AUTH ROUTES =====
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

  const user = await User.findOne({ $or: [{ username }, { email: username }] });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true, message: 'Login successful',
    data: { token, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role } }
  });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { username, email, password, name } = req.body;
  if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) return res.status(400).json({ success: false, message: 'Username or email already exists' });

  const user = await User.create({
    username, email, name: name || username,
    password: bcrypt.hashSync(password, 10), role: 'user'
  });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, message: 'Registration successful', data: { token, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role } } });
}));

// ===== SCHEMES =====
app.get('/api/schemes', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Scheme.find() });
}));
app.post('/api/schemes', authenticateToken, asyncHandler(async (req, res) => {
  const scheme = await Scheme.create({ ...req.body, status: 'active' });
  res.json({ success: true, message: 'Scheme created', data: scheme });
}));

// ===== MEMBERS =====
app.get('/api/members', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Member.find() });
}));
app.get('/api/members/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, data: member });
}));
app.post('/api/members', authenticateToken, asyncHandler(async (req, res) => {
  const member = await Member.create({
    schemeId: req.body.schemeId || null, name: req.body.name,
    phone: req.body.phone || '', email: req.body.email || '', address: req.body.address || '',
    paidMonths: req.body.paidMonths || 0, totalPaid: req.body.totalPaid || 0,
    taken: req.body.taken || false, takenMonth: req.body.takenMonth || null,
    chitAmountReceived: req.body.chitAmountReceived || null,
    groupId: req.body.groupId || null,
    interestPaid: req.body.interestPaid || 0, status: req.body.status || 'active',
    joinDate: new Date().toISOString().split('T')[0]
  });
  res.json({ success: true, message: 'Member added', data: member });
}));
app.put('/api/members/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const updated = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, message: 'Member updated', data: updated });
}));
app.delete('/api/members/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const removed = await Member.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, message: 'Member deleted' });
}));

// ===== PAYMENTS =====
app.get('/api/payments', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Payment.find() });
}));
app.post('/api/payments', authenticateToken, asyncHandler(async (req, res) => {
  const payment = await Payment.create({
    memberId: req.body.memberId, schemeId: req.body.schemeId || null,
    month: req.body.month, amount: req.body.amount,
    date: req.body.date || new Date().toISOString().split('T')[0],
    paymentMode: req.body.paymentMode || 'cash', transactionId: req.body.transactionId || '',
    remarks: req.body.remarks || '', status: 'completed'
  });

  const member = await Member.findById(payment.memberId);
  if (member) {
    member.paidMonths += 1;
    member.totalPaid += Number(payment.amount);
    await member.save();
  }

  res.json({ success: true, message: 'Payment recorded', data: payment });
}));
app.delete('/api/payments/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const removed = await Payment.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json({ success: true, message: 'Payment deleted' });
}));
app.put('/api/payments/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const updated = await Payment.findByIdAndUpdate(req.params.id, { amount: req.body.amount }, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json({ success: true, message: 'Payment updated', data: updated });
}));

// ===== GROUPS =====
app.get('/api/groups', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Group.find() });
}));
app.post('/api/groups', authenticateToken, asyncHandler(async (req, res) => {
  const group = await Group.create({ name: req.body.name, createdAt: new Date().toISOString().split('T')[0] });
  res.json({ success: true, message: 'Group created', data: group });
}));
app.delete('/api/groups/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const removed = await Group.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'Group not found' });
  res.json({ success: true, message: 'Group deleted' });
}));

// ===== LOANS =====
app.get('/api/loans', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Loan.find() });
}));
app.post('/api/loans', authenticateToken, asyncHandler(async (req, res) => {
  const principal = Number(req.body.principal);
  const rate = Number(req.body.interestRate);
  const duration = Number(req.body.duration);
  const totalInterest = Math.round((principal * rate * duration) / (12 * 100));

  const loan = await Loan.create({
    memberId: req.body.memberId, schemeId: req.body.schemeId || null,
    principal, interestRate: rate, duration, totalInterest, status: 'active',
    disbursalDate: req.body.disbursalDate || new Date().toISOString().split('T')[0]
  });

  res.json({ success: true, message: 'Loan created', data: loan });
}));
app.put('/api/loans/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const updated = await Loan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ success: false, message: 'Loan not found' });
  res.json({ success: true, message: 'Loan updated', data: updated });
}));
app.delete('/api/loans/:id', authenticateToken, validateObjectId(), asyncHandler(async (req, res) => {
  const removed = await Loan.findByIdAndDelete(req.params.id);
  if (!removed) return res.status(404).json({ success: false, message: 'Loan not found' });
  res.json({ success: true, message: 'Loan deleted' });
}));

// ===== REPORTS =====
app.get('/api/reports/summary', authenticateToken, asyncHandler(async (req, res) => {
  const [members, loans, payments] = await Promise.all([Member.find(), Loan.find(), Payment.find()]);

  const totalCollected = members.reduce((sum, m) => sum + (m.totalPaid || 0), 0);
  const totalDistributed = members.reduce((sum, m) => {
    if (m.taken) return sum + (m.chitAmountReceived || 100000);
    return sum;
  }, 0);
  const loanInterest = loans.reduce((sum, l) => sum + (l.totalInterest || 0), 0);
  const chitInterest = members.reduce((sum, m) => sum + (m.interestPaid || 0), 0);

  // Calculate extra collected from chit takers
  const extraCollected = members.reduce((sum, m) => {
    if (m.taken && m.takenMonth) {
      const remaining = Math.max(0, 20 - Number(m.takenMonth));
      return sum + (remaining * 1000);
    }
    return sum;
  }, 0);

  // Calculate net profit/loss
  const netProfit = extraCollected + loanInterest - chitInterest;

  const chitTakers = members.filter(m => m.taken).length;
  const completedMembers = members.filter(m => m.paidMonths >= 20).length;

  res.json({
    success: true,
    data: {
      totalMembers: members.length,
      totalCollected,
      totalDistributed,
      extraCollected,
      loanInterest,
      chitInterest,
      netProfit,
      chitTakers,
      completedMembers,
      totalLoans: loans.length,
      totalPayments: payments.length
    }
  });
}));

// ===== CHIT OPERATIONS =====
app.post('/api/chit/mark-taken', authenticateToken, asyncHandler(async (req, res) => {
  const { memberId, month, chitAmount } = req.body;
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    return res.status(400).json({ success: false, message: 'Invalid memberId' });
  }

  const updated = await Member.findByIdAndUpdate(memberId, {
    taken: true,
    takenMonth: month,
    chitAmountReceived: chitAmount || 100000
  }, { new: true });

  if (!updated) return res.status(404).json({ success: false, message: 'Member not found' });
  res.json({ success: true, message: 'Chit marked as taken', data: updated });
}));

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ===== START =====
if (!process.env.VERCEL) {
  async function start() {
    await connectDB();
    await seedDemoData();

    app.listen(PORT, () => {
      console.log('========================================');
      console.log('  GANESH CHITFUND - BACKEND SERVER');
      console.log('========================================');
      console.log(`  Server:  http://localhost:${PORT}`);
      console.log(`  API:     http://localhost:${PORT}/api`);
      console.log('');
      console.log('  Demo Credentials:');
      console.log('    admin / admin123');
      console.log('    manager / manager123');
      console.log('========================================');
    });
  }

  start();
}

module.exports = app;
