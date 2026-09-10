import express from 'express';
import Trade from '../models/Trade.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { getCryptoPrice, getCoinId } from '../utils/prices.js';
import { io } from '../server.js';

const router = express.Router();

const DURATIONS = {
  standard: { 30: 30, 60: 40, 120: 50, 180: 60 },
  premium: { 30: 72, 60: 76, 120: 80, 180: 82 },
};

router.post('/', protect, async (req, res) => {
  try {
    const { crypto, direction, amount, duration } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.trading_enabled) {
      return res.status(400).json({ message: 'Trading is disabled for your account' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    const profitPercent = user.premium_enabled
      ? DURATIONS.premium[duration]
      : DURATIONS.standard[duration];
    if (!profitPercent) {
      return res.status(400).json({ message: 'Invalid duration' });
    }

    let entryPrice;
    try {
      entryPrice = await getCryptoPrice(crypto);
    } catch (err) {
      // handled below
    }

    if (!entryPrice) {
      return res.status(400).json({ message: 'Could not fetch price' });
    }

    const trade = await Trade.create({
      user_id: user._id,
      user_email: user.email,
      crypto: crypto.toUpperCase(),
      direction,
      amount: Number(amount),
      entry_price: entryPrice,
      duration: Number(duration),
      profit_percent: profitPercent,
      expires_at: new Date(Date.now() + Number(duration) * 1000),
    });

    user.balance -= Number(amount);
    await user.save();

    res.status(201).json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user_id: req.user._id }).sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const trades = await Trade.find({}).sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/active', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user_id: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/resolve', protect, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade || trade.status !== 'active') {
      return res.status(400).json({ message: 'Trade not found or already resolved' });
    }

    let exitPrice;
    try {
      exitPrice = await getCryptoPrice(trade.crypto);
    } catch (err) {
      exitPrice = 0;
    }
    if (!exitPrice) exitPrice = trade.entry_price;

    let won;
    if (trade.admin_outcome) {
      won = trade.admin_outcome === 'won';
    } else {
      if (trade.direction === 'buy') {
        won = exitPrice > trade.entry_price;
      } else {
        won = exitPrice < trade.entry_price;
      }
    }

    trade.exit_price = exitPrice;
    trade.status = won ? 'won' : 'lost';
    trade.profit_loss = won
      ? Math.round(trade.amount * trade.profit_percent / 100 * 100) / 100
      : -trade.amount;

    await trade.save();

    const user = await User.findById(trade.user_id);
    if (user) {
      if (won) {
        user.balance += trade.amount + trade.profit_loss;
      }
      user.total_profit += trade.profit_loss;
      await user.save();
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/admin-outcome', protect, adminOnly, async (req, res) => {
  try {
    const { outcome } = req.body;
    if (!['won', 'lost'].includes(outcome)) {
      return res.status(400).json({ message: 'Invalid outcome' });
    }

    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    const profit = Math.round(trade.amount * trade.profit_percent / 100 * 100) / 100;

    const oldWon = trade.status === 'won';
    const newWon = outcome === 'won';

    const balanceEffect = (won) => (won ? trade.amount + profit : 0);
    const profitEffect = (won) => (won ? profit : -trade.amount);

    const balanceDelta = balanceEffect(newWon) - balanceEffect(oldWon);
    const profitDelta = profitEffect(newWon) - profitEffect(oldWon);

    let exitPrice;
    try {
      exitPrice = await getCryptoPrice(trade.crypto);
    } catch (err) {
      exitPrice = 0;
    }
    if (!exitPrice) exitPrice = trade.exit_price || trade.entry_price;

    trade.admin_outcome = outcome;
    trade.exit_price = exitPrice;
    trade.status = newWon ? 'won' : 'lost';
    trade.profit_loss = newWon ? profit : -trade.amount;
    await trade.save();

    const user = await User.findById(trade.user_id);
    if (user && (balanceDelta !== 0 || profitDelta !== 0)) {
      user.balance = Math.max(0, user.balance + balanceDelta);
      user.total_profit += profitDelta;
      await user.save();

      await Notification.create({
        user_id: user._id,
        user_email: user.email,
        title: newWon ? 'Trade Won!' : 'Trade Lost',
        message: adminText(newWon, trade, profit),
        type: newWon ? 'trade_won' : 'trade_lost',
        related_id: trade._id.toString(),
      });

      io?.to(user._id.toString()).emit('trade-resolved', trade);
      io?.to(user._id.toString()).emit('balance-update', { balance: user.balance });
    }

    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

function adminText(won, trade, profit) {
  if (won) return `Admin settled your ${trade.direction} trade on ${trade.crypto} — credited $${(trade.amount + profit).toFixed(2)}`;
  return `Admin settled your ${trade.direction} trade on ${trade.crypto} — lost $${trade.amount.toFixed(2)}`;
}

export default router;
