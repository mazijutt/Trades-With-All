```js
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();


// ==========================================
// GET ALL USERS
// ==========================================
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({
      role: { $ne: 'admin' }
    })
      .select('+withdrawal_password')
      .populate('referred_by', 'full_name email')
      .sort({ createdAt: -1 });

    const result = users.map((u) => {
      const obj = u.toJSON();

      obj.has_withdrawal_password =
        !!u.withdrawal_password;

      obj.referral_count =
        (u.referrals || []).length;

      // Balance information
      obj.balance =
        Number(u.balance || 0);

      obj.frozen_balance =
        Number(u.frozen_balance || 0);

      obj.available_balance =
        Math.max(
          0,
          obj.balance - obj.frozen_balance
        );

      delete obj.withdrawal_password;
      delete obj.referrals;

      return obj;
    });

    res.json(result);

  } catch (error) {
    console.error('GET USERS ERROR:', error);

    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// GET SINGLE USER
// ==========================================
router.get('/:id', protect, async (req, res) => {
  try {
    const user =
      await User.findById(req.params.id)
        .select('+withdrawal_password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const obj = user.toJSON();

    obj.has_withdrawal_password =
      !!user.withdrawal_password;

    // Balance information
    obj.balance =
      Number(user.balance || 0);

    obj.frozen_balance =
      Number(user.frozen_balance || 0);

    obj.available_balance =
      Math.max(
        0,
        obj.balance - obj.frozen_balance
      );

    delete obj.withdrawal_password;

    res.json(obj);

  } catch (error) {
    console.error('GET USER ERROR:', error);

    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// FREEZE USER AMOUNT
// ==========================================
router.post('/:id/freeze', protect, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid freeze amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const balance =
      Number(user.balance || 0);

    const frozen =
      Number(user.frozen_balance || 0);

    const available =
      balance - frozen;

    if (value > available) {
      return res.status(400).json({
        message:
          `Only ${available.toFixed(2)} is available to freeze`
      });
    }

    user.frozen_balance =
      frozen + value;

    await user.save();

    return res.json({
      message: 'Amount frozen successfully',

      balance:
        Number(user.balance || 0),

      frozen_balance:
        Number(user.frozen_balance || 0),

      available_balance:
        Math.max(
          0,
          Number(user.balance || 0) -
          Number(user.frozen_balance || 0)
        ),

      reason: reason || ''
    });

  } catch (error) {
    console.error(
      'FREEZE AMOUNT ERROR:',
      error
    );

    return res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// UNFREEZE USER AMOUNT
// ==========================================
router.post('/:id/unfreeze', protect, adminOnly, async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid unfreeze amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const frozen =
      Number(user.frozen_balance || 0);

    if (frozen <= 0) {
      return res.status(400).json({
        message:
          'No amount is currently frozen'
      });
    }

    if (value > frozen) {
      return res.status(400).json({
        message:
          `Only ${frozen.toFixed(2)} is currently frozen`
      });
    }

    user.frozen_balance =
      frozen - value;

    if (user.frozen_balance < 0) {
      user.frozen_balance = 0;
    }

    await user.save();

    return res.json({
      message:
        'Amount unfrozen successfully',

      balance:
        Number(user.balance || 0),

      frozen_balance:
        Number(user.frozen_balance || 0),

      available_balance:
        Math.max(
          0,
          Number(user.balance || 0) -
          Number(user.frozen_balance || 0)
        ),

      reason: reason || ''
    });

  } catch (error) {
    console.error(
      'UNFREEZE AMOUNT ERROR:',
      error
    );

    return res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// UPDATE USER
// ==========================================
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const updates = {};

    const allowed = [
      'balance',
      'total_profit',
      'total_deposited',
      'total_withdrawn',
      'credit_score',
      'withdrawal_enabled',
      'trading_enabled',
      'premium_enabled',
      'identity_status',
      'role',
      'login_password'
    ];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user =
      await User.findByIdAndUpdate(
        req.params.id,
        updates,
        {
          new: true
        }
      );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(user);

  } catch (error) {
    console.error(
      'UPDATE USER ERROR:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// ADJUST BALANCE
// ==========================================
router.post('/:id/adjust-balance', protect, adminOnly, async (req, res) => {
  try {
    const {
      amount,
      action
    } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (action === 'add') {

      user.balance =
        Number(user.balance || 0) + value;

    } else if (action === 'deduct') {

      const balance =
        Number(user.balance || 0);

      const frozen =
        Number(user.frozen_balance || 0);

      const available =
        Math.max(0, balance - frozen);

      // Do not allow admin deduction
      // from frozen amount
      if (value > available) {
        return res.status(400).json({
          message:
            `Only ${available.toFixed(2)} is available to deduct`
        });
      }

      user.balance =
        balance - value;

    } else {

      return res.status(400).json({
        message: 'Invalid action'
      });
    }

    await user.save();

    res.json({
      ...user.toJSON(),

      balance:
        Number(user.balance || 0),

      frozen_balance:
        Number(user.frozen_balance || 0),

      available_balance:
        Math.max(
          0,
          Number(user.balance || 0) -
          Number(user.frozen_balance || 0)
        )
    });

  } catch (error) {
    console.error(
      'ADJUST BALANCE ERROR:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// TOGGLE USER SETTINGS
// ==========================================
router.post('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const { field } = req.body;

    const allowed = [
      'trading_enabled',
      'withdrawal_enabled',
      'premium_enabled'
    ];

    if (!allowed.includes(field)) {
      return res.status(400).json({
        message: 'Invalid field'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user[field] =
      !user[field];

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// ADD DEPOSIT
// ==========================================
router.post('/:id/add-deposit', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.total_deposited =
      Number(user.total_deposited || 0) + value;

    user.balance =
      Number(user.balance || 0) + value;

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// ADD WITHDRAWAL
// ==========================================
router.post('/:id/add-withdrawal', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const balance =
      Number(user.balance || 0);

    const frozen =
      Number(user.frozen_balance || 0);

    const available =
      Math.max(
        0,
        balance - frozen
      );

    if (value > available) {
      return res.status(400).json({
        message:
          `Only ${available.toFixed(2)} is available`
      });
    }

    user.total_withdrawn =
      Number(user.total_withdrawn || 0) + value;

    user.balance =
      balance - value;

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// ADD PROFIT
// ==========================================
router.post('/:id/add-profit', protect, adminOnly, async (req, res) => {
  try {
    const { amount } = req.body;

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid amount'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.total_profit =
      Number(user.total_profit || 0) + value;

    user.balance =
      Number(user.balance || 0) + value;

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// SET CREDIT SCORE
// ==========================================
router.post('/:id/set-credit-score', protect, adminOnly, async (req, res) => {
  try {
    const { score } = req.body;

    const value = Number(score);

    if (!Number.isFinite(value)) {
      return res.status(400).json({
        message: 'Invalid score'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.credit_score =
      value;

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// SET WITHDRAWAL PASSWORD
// ==========================================
router.post('/:id/set-withdrawal-password', protect, adminOnly, async (req, res) => {
  try {
    const {
      withdrawal_password
    } = req.body;

    if (!withdrawal_password) {
      return res.status(400).json({
        message:
          'Withdrawal password is required'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.withdrawal_password =
      await bcrypt.hash(
        withdrawal_password,
        12
      );

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// SET LOGIN PASSWORD
// ==========================================
router.post('/:id/set-password', protect, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: 'Password is required'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.password =
      password;

    await user.save();

    res.json({
      message:
        'Password updated'
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// CREDIT SCORE ADJUSTMENT
// ==========================================
router.post('/:id/credit-score', protect, adminOnly, async (req, res) => {
  try {
    const {
      points,
      action
    } = req.body;

    const value =
      Number(points);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({
        message: 'Invalid points'
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    if (action === 'increase') {

      user.credit_score =
        Number(user.credit_score || 0) + value;

    } else {

      user.credit_score =
        Number(user.credit_score || 0) - value;

      if (user.credit_score < 0) {
        user.credit_score = 0;
      }
    }

    await user.save();

    res.json(user);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


// ==========================================
// VERIFY USER
// ==========================================
router.post('/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const {
      status
    } = req.body;

    const allowedStatuses = [
      'pending',
      'verified',
      'rejected'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          `Invalid verification status: ${status}`
      });
    }

    const user =
      await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    user.identity_status =
      status;

    if (status === 'verified') {
      user.is_verified = true;
    }

    if (status === 'rejected') {
      user.is_verified = false;
    }

    await user.save();

    return res.json({
      message:
        `User ${status} successfully`,
      user
    });

  } catch (error) {
    console.error(
      'VERIFY USER ERROR:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Failed to update verification status',

      error:
        error.name ||
        'UnknownError'
    });
  }
});


// ==========================================
// DELETE USER
// ==========================================
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user =
      await User.findByIdAndDelete(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      message:
        'User deleted'
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
});


export default router;
```
