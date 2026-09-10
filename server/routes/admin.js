import express from 'express';
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [users, trades, transactions] = await Promise.all([
      User.find({ role: { $ne: 'admin' } }),
      Trade.find({}),
      Transaction.find({}),
    ]);

    const approvedDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'approved');
    const approvedWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved');
    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    const pendingVerifications = users.filter(u => u.identity_status === 'pending');
    const activeTrades = trades.filter(t => t.status === 'active');

    const totalDeposits = approvedDeposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = approvedWithdrawals.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      totalUsers: users.length,
      totalTrades: trades.length,
      activeTrades: activeTrades.length,
      totalDeposits,
      totalWithdrawals,
      totalRevenue: totalDeposits - totalWithdrawals,
      pendingTransactions: pendingTransactions.length,
      pendingVerifications: pendingVerifications.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('+withdrawal_password')
      .populate('referred_by', 'full_name email')
      .sort({ createdAt: -1 });
    const result = users.map((u) => {
      const obj = u.toJSON();
      obj.has_withdrawal_password = !!u.withdrawal_password;
      obj.referral_count = (u.referrals || []).length;
      delete obj.withdrawal_password;
      delete obj.referrals;
      return obj;
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/trades', protect, adminOnly, async (req, res) => {
  try {
    const trades = await Trade.find({})
      .populate('user_id', 'full_name email')
      .sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.role = 'admin';
      existing.password = password;
      await existing.save();
      return res.json({ message: 'Admin updated' });
    }
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name || 'Admin',
      role: 'admin',
      balance: 0,
      is_verified: true,
    });
    res.status(201).json({ message: 'Admin created', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
