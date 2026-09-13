import express from 'express';
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ==========================================
// ADMIN STATS
// ==========================================
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [users, trades, transactions] = await Promise.all([
      User.find({ role: { $ne: 'admin' } }),
      Trade.find({}),
      Transaction.find({}),
    ]);

    const approvedDeposits = transactions.filter(
      t => t.type === 'deposit' && t.status === 'approved'
    );

    const approvedWithdrawals = transactions.filter(
      t => t.type === 'withdrawal' && t.status === 'approved'
    );

    const pendingTransactions = transactions.filter(
      t => t.status === 'pending'
    );

    const pendingVerifications = users.filter(
      u => u.identity_status === 'pending'
    );

    const activeTrades = trades.filter(
      t => t.status === 'active'
    );

    const totalDeposits = approvedDeposits.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

    const totalWithdrawals = approvedWithdrawals.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0
    );

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
    res.status(500).json({
      message: error.message,
    });
  }
});

// ==========================================
// GET ALL USERS
// ==========================================
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: 'admin' },
    })
      .select('+withdrawal_password')
      .populate('referred_by', 'full_name email')
      .sort({ createdAt: -1 });

    const result = users.map((u) => {
      const obj = u.toJSON();

      obj.has_withdrawal_password = !!u.withdrawal_password;
      obj.referral_count = (u.referrals || []).length;

      obj.balance = Number(u.balance || 0);
      obj.frozen_balance = Number(u.frozen_balance || 0);
      obj.available_balance =
        obj.balance - obj.frozen_balance;

      delete obj.withdrawal_password;
      delete obj.referrals;

      return obj;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// ==========================================
// FREEZE USER AMOUNT
// ==========================================
router.post('/users/:id/freeze', protect, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const freezeAmount = Number(amount);

    if (!Number.isFinite(freezeAmount) || freezeAmount <= 0) {
      return res.status(400).json({
        message: 'Please enter a valid freeze amount',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const currentBalance = Number(user.balance || 0);
    const currentFrozen = Number(user.frozen_balance || 0);

    const availableBalance =
      currentBalance - currentFrozen;

    if (freezeAmount > availableBalance) {
      return res.status(400).json({
        message: `Only ${availableBalance.toFixed(2)} is available to freeze`,
      });
    }

    user.frozen_balance =
      currentFrozen + freezeAmount;

    await user.save();

    try {
      await Notification.create({
        user_id: user._id,
        title: 'Amount Frozen',
        message:
          `$${freezeAmount.toFixed(2)} has been frozen from your available balance.` +
          (reason ? ` Reason: ${reason}` : ''),
        type: 'warning',
      });
    } catch (notificationError) {
      console.error(
        'Notification error:',
        notificationError.message
      );
    }

    const newFrozenBalance =
      Number(user.frozen_balance || 0);

    res.json({
      message: 'Amount frozen successfully',
      balance: currentBalance,
      frozen_balance: newFrozenBalance,
      available_balance:
        currentBalance - newFrozenBalance,
    });

  } catch (error) {
    console.error(
      'Freeze amount error:',
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// ==========================================
// UNFREEZE USER AMOUNT
// ==========================================
router.post('/users/:id/unfreeze', protect, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const unfreezeAmount = Number(amount);

    if (
      !Number.isFinite(unfreezeAmount) ||
      unfreezeAmount <= 0
    ) {
      return res.status(400).json({
        message: 'Please enter a valid unfreeze amount',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    const currentFrozen =
      Number(user.frozen_balance || 0);

    if (currentFrozen <= 0) {
      return res.status(400).json({
        message: 'This user has no frozen amount',
      });
    }

    if (unfreezeAmount > currentFrozen) {
      return res.status(400).json({
        message:
          `Only ${currentFrozen.toFixed(2)} is currently frozen`,
      });
    }

    user.frozen_balance =
      currentFrozen - unfreezeAmount;

    if (user.frozen_balance < 0) {
      user.frozen_balance = 0;
    }

    await user.save();

    try {
      await Notification.create({
        user_id: user._id,
        title: 'Amount Unfrozen',
        message:
          `$${unfreezeAmount.toFixed(2)} has been unfrozen and is now available.` +
          (reason ? ` ${reason}` : ''),
        type: 'success',
      });
    } catch (notificationError) {
      console.error(
        'Notification error:',
        notificationError.message
      );
    }

    const balance =
      Number(user.balance || 0);

    const frozenBalance =
      Number(user.frozen_balance || 0);

    res.json({
      message: 'Amount unfrozen successfully',
      balance,
      frozen_balance: frozenBalance,
      available_balance:
        balance - frozenBalance,
    });

  } catch (error) {
    console.error(
      'Unfreeze amount error:',
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// ==========================================
// GET ALL TRADES
// ==========================================
router.get('/trades', protect, adminOnly, async (req, res) => {
  try {
    const trades = await Trade.find({})
      .populate('user_id', 'full_name email')
      .sort({ createdAt: -1 });

    res.json(trades);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// ==========================================
// CREATE / UPDATE ADMIN
// ==========================================
router.post('/create-admin', async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const existing = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existing) {
      existing.role = 'admin';
      existing.password = password;

      if (full_name) {
        existing.full_name = full_name;
      }

      existing.is_verified = true;

      await existing.save();

      return res.json({
        message: 'Admin updated',
      });
    }

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      full_name: full_name || 'Admin',
      role: 'admin',
      balance: 0,
      frozen_balance: 0,
      is_verified: true,
    });

    res.status(201).json({
      message: 'Admin created',
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
