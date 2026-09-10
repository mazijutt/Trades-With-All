import express from 'express';
import Setting from '../models/Setting.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const DEFAULTS = { inr_rate: 85, site_referral_code: 'J9115UTT', support_telegram: 'GeminieSupportBot' };

/* =========================
   PUBLIC SETTINGS (no auth)
========================= */
router.get('/public', async (req, res) => {
  try {
    const settings = await Setting.find({});
    const result = { ...DEFAULTS, support_telegram: DEFAULTS.support_telegram, inr_rate: DEFAULTS.inr_rate };
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json({ support_telegram: String(result.support_telegram).replace(/^@/, '') });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const settings = await Setting.find({});
    const result = { ...DEFAULTS };
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/', protect, adminOnly, async (req, res) => {
  try {
    const { key, value } = req.body;
    const allowed = ['inr_rate', 'site_referral_code', 'support_telegram'];
    if (!allowed.includes(key)) {
      return res.status(400).json({ message: 'Invalid setting key' });
    }
    await Setting.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
    res.json({ [key]: value });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;