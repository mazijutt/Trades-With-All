import express from 'express';
import FixedDeposit from '../models/FixedDeposit.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public: only active FD products are visible to users.
router.get('/public', async (req, res) => {
  try {
    const plans = await FixedDeposit.find({ is_active: true }).sort({ sort_order: 1, createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: manage all FD products.
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const plans = await FixedDeposit.find({}).sort({ sort_order: 1, createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, short_name, interest_rate, tenure, min_amount, max_amount, payout, description, is_active, sort_order } = req.body;
    if (!name || !tenure || interest_rate === undefined || interest_rate === '') {
      return res.status(400).json({ message: 'Name, interest rate and tenure are required' });
    }

    const plan = await FixedDeposit.create({
      name,
      short_name,
      interest_rate: Number(interest_rate),
      tenure,
      min_amount: Number(min_amount || 0),
      max_amount: Number(max_amount || 0),
      payout,
      description,
      is_active: is_active !== false,
      sort_order: Number(sort_order || 0),
    });
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.interest_rate !== undefined) updates.interest_rate = Number(updates.interest_rate);
    if (updates.min_amount !== undefined) updates.min_amount = Number(updates.min_amount);
    if (updates.max_amount !== undefined) updates.max_amount = Number(updates.max_amount);
    if (updates.sort_order !== undefined) updates.sort_order = Number(updates.sort_order);

    const plan = await FixedDeposit.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: 'FD plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const plan = await FixedDeposit.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ message: 'FD plan not found' });
    res.json({ message: 'FD plan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
