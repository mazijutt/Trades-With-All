import express from 'express';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_MASTER_CODE = 'J9115UTT';

export async function getMasterReferralCode() {
  const setting = await Setting.findOne({ key: 'site_referral_code' });
  return String(setting?.value || DEFAULT_MASTER_CODE).trim().toUpperCase();
}

/* =========================
   GET MASTER REFERRAL CODE (public)
========================= */
router.get('/code', async (req, res) => {
  try {
    const code = await getMasterReferralCode();
    res.json({ code });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   GET MASTER REFERRAL INFO (admin)
========================= */
router.get('/master', protect, adminOnly, async (req, res) => {
  try {
    const code = await getMasterReferralCode();
    const owner = await User.findOne({ referral_code: code });
    res.json({
      code,
      owner: owner
        ? { _id: owner._id, email: owner.email, full_name: owner.full_name, referral_count: (owner.referrals || []).length }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/* =========================
   SET MASTER REFERRAL CODE (admin)
========================= */
router.post('/set-master', protect, adminOnly, async (req, res) => {
  try {
    const { code, owner_id } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const newCode = String(code).trim().toUpperCase();

    const owner = await User.findById(owner_id);
    if (!owner) {
      return res.status(400).json({ message: 'Owner user not found' });
    }

    await User.updateMany(
      { referral_code: newCode, _id: { $ne: owner._id } },
      { $set: { referral_code: null } }
    );

    owner.referral_code = newCode;
    await owner.save();

    await Setting.findOneAndUpdate(
      { key: 'site_referral_code' },
      { key: 'site_referral_code', value: newCode },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Master referral code updated',
      code: newCode,
      owner: { _id: owner._id, email: owner.email, full_name: owner.full_name },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This referral code is already in use' });
    }
    res.status(500).json({ message: error.message });
  }
});

export default router;