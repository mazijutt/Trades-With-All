import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, async (req, res) => {
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

router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+withdrawal_password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const obj = user.toJSON();
    obj.has_withdrawal_password = !!user.withdrawal_password;
    delete obj.withdrawal_password;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updates = {};
    const allowed = ['balance', 'total_profit', 'total_deposited', 'total_withdrawn',
      'credit_score', 'withdrawal_enabled', 'trading_enabled', 'premium_enabled',
      'identity_status', 'role', 'login_password'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/adjust-balance', protect, adminOnly, async (req, res) => {
  try {
    const { amount, action } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (action === 'add') {
      user.balance += Number(amount);
    } else if (action === 'deduct') {
      user.balance -= Number(amount);
      if (user.balance < 0) user.balance = 0;
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const { field } = req.body;
    const allowed = ['trading_enabled', 'withdrawal_enabled', 'premium_enabled'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ message: 'Invalid field' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user[field] = !user[field];
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/add-deposit', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;
    const value = Number(amount);
    if (!value || value <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.total_deposited += value;
    user.balance += value;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/add-withdrawal', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;
    const value = Number(amount);
    if (!value || value <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.total_withdrawn += value;
    user.balance -= value;
    if (user.balance < 0) user.balance = 0;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/add-profit', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;
    const value = Number(amount);
    if (!value || value <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.total_profit += value;
    user.balance += value;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/set-credit-score', protect, adminOnly, async (req, res) => {
  try {
    const { score } = req.body;
    const value = Number(score);
    if (isNaN(value)) return res.status(400).json({ message: 'Invalid score' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.credit_score = value;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/set-withdrawal-password', protect, adminOnly, async (req, res) => {
  try {
    const { withdrawal_password } = req.body;
    if (!withdrawal_password) {
      return res.status(400).json({ message: 'Withdrawal password is required' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.withdrawal_password = await bcrypt.hash(withdrawal_password, 12);
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/set-password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/credit-score', protect, adminOnly, async (req, res) => {
  try {
    const { points, action } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (action === 'increase') {
      user.credit_score += Number(points);
    } else {
      user.credit_score -= Number(points);
      if (user.credit_score < 0) user.credit_score = 0;
    }
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { identity_status: status }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
