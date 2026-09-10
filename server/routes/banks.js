import express from 'express';
import BankAccount from '../models/BankAccount.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const banks = await BankAccount.find({ is_active: true }).sort({ createdAt: -1 });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const banks = await BankAccount.find({}).sort({ createdAt: -1 });
    res.json(banks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { bank_name, account_holder, account_number, ifsc_code, upi_id, branch, note } = req.body;
    if (!bank_name || !account_holder || !account_number) {
      return res.status(400).json({ message: 'Bank name, holder and account number are required' });
    }
    const bank = await BankAccount.create({
      bank_name,
      account_holder,
      account_number,
      ifsc_code: ifsc_code || '',
      upi_id: upi_id || '',
      branch: branch || '',
      note: note || '',
    });
    res.status(201).json(bank);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const bank = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bank) return res.status(404).json({ message: 'Bank not found' });
    res.json(bank);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await BankAccount.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bank deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;