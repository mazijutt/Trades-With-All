import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Setting from '../models/Setting.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { type, amount, amount_inr, method, wallet_address, tx_hash } = req.body;
    if (!type || (!amount && !amount_inr)) {
      return res.status(400).json({ message: 'Type and amount are required' });
    }

    let finalAmount = Number(amount);
    let finalInr = Number(amount_inr) || 0;
    let finalMethod = method || 'USDT_TRC20';
    let bankDetails = null;

    const user = await User.findById(req.user._id);

    if (amount_inr && finalInr > 0) {
      const setting = await Setting.findOne({ key: 'inr_rate' });
      const rate = setting && setting.value ? Number(setting.value) : 85;
      finalAmount = Math.round((finalInr / rate) * 100) / 100;
      if (!finalMethod || finalMethod === 'USDT_TRC20') {
        finalMethod = 'Bank Transfer';
      }
    }

    if (type === 'withdrawal') {
      if (!user.withdrawal_enabled) {
        return res.status(400).json({ message: 'Withdrawals are disabled for your account' });
      }
      if (user.balance < finalAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      if (finalMethod === 'Bank Transfer') {
        if (!user.bank_name || !user.bank_account_holder || !user.bank_account_number) {
          return res.status(400).json({ message: 'Please save your bank details before requesting a bank withdrawal' });
        }
        bankDetails = {
          bank_name: user.bank_name,
          account_holder: user.bank_account_holder,
          account_number: user.bank_account_number,
          ifsc: user.bank_ifsc || '',
          branch: user.bank_branch || '',
        };
      }
    }

    const transaction = await Transaction.create({
      user_id: req.user._id,
      user_email: req.user.email,
      type,
      amount: finalAmount,
      amount_inr: finalInr,
      method: finalMethod,
      wallet_address: wallet_address || '',
      tx_hash: tx_hash || '',
      bank_details: bankDetails,
    });

    await Notification.create({
      user_id: req.user._id,
      user_email: 'admin',
      title: type === 'deposit' ? 'New Deposit Request' : 'New Withdrawal Request',
      message: `${req.user.email} requested a ${type} of $${finalAmount}${finalInr ? ` (₹${finalInr})` : ''} via ${finalMethod}${bankDetails ? ` to ${bankDetails.bank_name} ${bankDetails.account_number}` : ''}`,
      type: type === 'deposit' ? 'deposit_request' : 'withdrawal_request',
      related_id: transaction._id.toString(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const transactions = await Transaction.find({}).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction already processed' });
    }

    transaction.status = 'approved';
    transaction.admin_note = `Approved by admin on ${new Date().toISOString()}`;
    await transaction.save();

    const user = await User.findById(transaction.user_id);
    if (user) {
      if (transaction.type === 'deposit') {
        user.balance += transaction.amount;
        user.total_deposited += transaction.amount;
      } else {
        user.balance = Math.max(0, user.balance - transaction.amount);
        user.total_withdrawn += transaction.amount;
      }
      await user.save();
    }

    const mayPayOut = transaction.type === 'withdrawal' && transaction.method === 'Bank Transfer';
    await Notification.create({
      user_id: transaction.user_id,
      user_email: transaction.user_email,
      title: `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Approved`,
      message: `Your ${transaction.type} of $${transaction.amount}${transaction.amount_inr ? ` (₹${transaction.amount_inr})` : ''} has been approved.${mayPayOut ? ' Payout will be sent to your bank account.' : ''}`,
      type: transaction.type === 'deposit' ? 'deposit_approved' : 'withdrawal_approved',
      related_id: transaction._id.toString(),
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    transaction.status = 'rejected';
    transaction.admin_note = reason || 'Rejected by admin';
    await transaction.save();

    await Notification.create({
      user_id: transaction.user_id,
      user_email: transaction.user_email,
      title: `${transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Rejected`,
      message: `Your ${transaction.type} of $${transaction.amount}${transaction.amount_inr ? ` (₹${transaction.amount_inr})` : ''} has been rejected. ${reason || ''}`,
      type: transaction.type === 'deposit' ? 'deposit_rejected' : 'withdrawal_rejected',
      related_id: transaction._id.toString(),
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
