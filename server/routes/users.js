```js
import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

/*
|--------------------------------------------------------------------------
| NUMBER HELPERS
|--------------------------------------------------------------------------
*/

function toNumber(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

function getFrozenBalance(user) {
  return Math.max(
    0,
    toNumber(user.frozen_balance, 0)
  );
}

function getAvailableBalance(user) {
  const balance = Math.max(
    0,
    toNumber(user.balance, 0)
  );

  const frozen = getFrozenBalance(user);

  return Math.max(
    0,
    balance - frozen
  );
}

/*
|--------------------------------------------------------------------------
| PUBLIC HELPERS FOR TRADE / WITHDRAWAL ROUTES
|--------------------------------------------------------------------------
*/

function ensureTradingAllowed(user, amount = 0) {
  if (!user) {
    throw new Error('User not found.');
  }

  if (user.trading_enabled === false) {
    throw new Error('Trading is disabled for this account.');
  }

  const requestedAmount = toNumber(amount, 0);

  if (requestedAmount <= 0) {
    throw new Error('Invalid trading amount.');
  }

  const available = getAvailableBalance(user);

  if (requestedAmount > available) {
    throw new Error(
      `Insufficient available balance. Available balance is ${available}.`
    );
  }

  return true;
}

function ensureWithdrawalAllowed(user, amount = 0) {
  if (!user) {
    throw new Error('User not found.');
  }

  if (user.withdrawal_enabled === false) {
    throw new Error('Withdrawals are disabled for this account.');
  }

  const requestedAmount = toNumber(amount, 0);

  if (requestedAmount <= 0) {
    throw new Error('Invalid withdrawal amount.');
  }

  const available = getAvailableBalance(user);

  if (requestedAmount > available) {
    throw new Error(
      `Insufficient available balance. Available balance is ${available}.`
    );
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| GET ALL USERS
|--------------------------------------------------------------------------
*/

router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .populate(
        'referred_by',
        'full_name email referral_code'
      )
      .sort({ createdAt: -1 });

    const result = users.map((user) => {
      const data = user.toObject();

      const frozen = getFrozenBalance(user);
      const available = getAvailableBalance(user);

      return {
        ...data,
        frozen_balance: frozen,
        available_balance: available,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('GET USERS ERROR:', error);

    res.status(500).json({
      message: 'Failed to fetch users.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET SINGLE USER
|--------------------------------------------------------------------------
*/

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'referred_by',
      'full_name email referral_code'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const data = user.toObject();

    data.frozen_balance = getFrozenBalance(user);
    data.available_balance = getAvailableBalance(user);

    res.json(data);
  } catch (error) {
    console.error('GET USER ERROR:', error);

    res.status(500).json({
      message: 'Failed to fetch user.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE USER
|--------------------------------------------------------------------------
*/

router.put('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'full_name',
      'mobile',
      'country_code',
      'date_of_birth',
      'language',
      'bank_name',
      'bank_account_holder',
      'bank_account_number',
      'bank_ifsc',
      'premium_enabled',
      'trading_enabled',
      'withdrawal_enabled',
      'identity_status',
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const data = user.toObject();

    data.frozen_balance = getFrozenBalance(user);
    data.available_balance = getAvailableBalance(user);

    res.json({
      message: 'User updated successfully.',
      user: data,
    });
  } catch (error) {
    console.error('UPDATE USER ERROR:', error);

    res.status(500).json({
      message: 'Failed to update user.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| TOGGLE USER SETTINGS
|--------------------------------------------------------------------------
*/

router.post('/:id/toggle', async (req, res) => {
  try {
    const { field } = req.body;

    const allowedFields = [
      'trading_enabled',
      'withdrawal_enabled',
      'premium_enabled',
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        message: 'Invalid toggle field.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user[field] = !Boolean(user[field]);

    await user.save();

    res.json({
      message: `${field} updated successfully.`,
      field,
      value: user[field],
      user,
    });
  } catch (error) {
    console.error('TOGGLE USER ERROR:', error);

    res.status(500).json({
      message: 'Failed to update user setting.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADJUST BALANCE
|--------------------------------------------------------------------------
*/

router.post('/:id/adjust-balance', async (req, res) => {
  try {
    const {
      action,
      amount,
    } = req.body;

    const value = toNumber(amount, 0);

    if (!['add', 'deduct'].includes(action)) {
      return res.status(400).json({
        message: 'Action must be add or deduct.',
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const available = getAvailableBalance(user);

    if (action === 'deduct') {
      if (value > available) {
        return res.status(400).json({
          message:
            `Cannot deduct ${value}. Available balance is ${available}.`,
          balance: user.balance || 0,
          frozen_balance: getFrozenBalance(user),
          available_balance: available,
        });
      }

      user.balance =
        toNumber(user.balance, 0) - value;
    } else {
      user.balance =
        toNumber(user.balance, 0) + value;
    }

    await user.save();

    const frozen = getFrozenBalance(user);
    const newAvailable = getAvailableBalance(user);

    res.json({
      message:
        action === 'add'
          ? 'Balance added successfully.'
          : 'Balance deducted successfully.',

      balance: user.balance,
      frozen_balance: frozen,
      available_balance: newAvailable,
    });
  } catch (error) {
    console.error('ADJUST BALANCE ERROR:', error);

    res.status(500).json({
      message: 'Failed to adjust balance.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| FREEZE BALANCE
|--------------------------------------------------------------------------
*/

router.post('/:id/freeze', async (req, res) => {
  try {
    const value = toNumber(
      req.body.amount,
      0
    );

    if (value <= 0) {
      return res.status(400).json({
        message: 'Freeze amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const currentBalance = Math.max(
      0,
      toNumber(user.balance, 0)
    );

    const currentFrozen = getFrozenBalance(user);

    const available = Math.max(
      0,
      currentBalance - currentFrozen
    );

    if (value > available) {
      return res.status(400).json({
        message:
          `Cannot freeze ${value}. Available balance is ${available}.`,
        balance: currentBalance,
        frozen_balance: currentFrozen,
        available_balance: available,
      });
    }

    user.frozen_balance =
      currentFrozen + value;

    await user.save();

    const newFrozen =
      getFrozenBalance(user);

    const newAvailable =
      getAvailableBalance(user);

    res.json({
      message:
        `${value} has been frozen successfully.`,

      balance: user.balance,
      frozen_balance: newFrozen,
      available_balance: newAvailable,
    });
  } catch (error) {
    console.error('FREEZE BALANCE ERROR:', error);

    res.status(500).json({
      message: 'Failed to freeze balance.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| UNFREEZE BALANCE
|--------------------------------------------------------------------------
*/

router.post('/:id/unfreeze', async (req, res) => {
  try {
    const value = toNumber(
      req.body.amount,
      0
    );

    if (value <= 0) {
      return res.status(400).json({
        message: 'Unfreeze amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const currentFrozen =
      getFrozenBalance(user);

    if (value > currentFrozen) {
      return res.status(400).json({
        message:
          `Cannot unfreeze ${value}. Frozen balance is ${currentFrozen}.`,
        balance: user.balance || 0,
        frozen_balance: currentFrozen,
        available_balance: getAvailableBalance(user),
      });
    }

    user.frozen_balance =
      currentFrozen - value;

    if (user.frozen_balance < 0) {
      user.frozen_balance = 0;
    }

    await user.save();

    const newFrozen =
      getFrozenBalance(user);

    const newAvailable =
      getAvailableBalance(user);

    res.json({
      message:
        `${value} has been unfrozen successfully.`,

      balance: user.balance,
      frozen_balance: newFrozen,
      available_balance: newAvailable,
    });
  } catch (error) {
    console.error('UNFREEZE BALANCE ERROR:', error);

    res.status(500).json({
      message: 'Failed to unfreeze balance.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADD DEPOSIT
|--------------------------------------------------------------------------
*/

router.post('/:id/add-deposit', async (req, res) => {
  try {
    const value = toNumber(
      req.body.amount,
      0
    );

    if (value <= 0) {
      return res.status(400).json({
        message: 'Deposit amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.balance =
      toNumber(user.balance, 0) + value;

    user.total_deposited =
      toNumber(user.total_deposited, 0) + value;

    await user.save();

    res.json({
      message: 'Deposit added successfully.',
      balance: user.balance,
      total_deposited: user.total_deposited,
      frozen_balance: getFrozenBalance(user),
      available_balance: getAvailableBalance(user),
    });
  } catch (error) {
    console.error('ADD DEPOSIT ERROR:', error);

    res.status(500).json({
      message: 'Failed to add deposit.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADD WITHDRAWAL
|--------------------------------------------------------------------------
*/

router.post('/:id/add-withdrawal', async (req, res) => {
  try {
    const value = toNumber(
      req.body.amount,
      0
    );

    if (value <= 0) {
      return res.status(400).json({
        message: 'Withdrawal amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.total_withdrawn =
      toNumber(user.total_withdrawn, 0) + value;

    await user.save();

    res.json({
      message:
        'Withdrawal total updated successfully.',
      balance: user.balance,
      total_withdrawn: user.total_withdrawn,
      frozen_balance: getFrozenBalance(user),
      available_balance: getAvailableBalance(user),
    });
  } catch (error) {
    console.error('ADD WITHDRAWAL ERROR:', error);

    res.status(500).json({
      message: 'Failed to update withdrawal total.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADD PROFIT
|--------------------------------------------------------------------------
*/

router.post('/:id/add-profit', async (req, res) => {
  try {
    const value = toNumber(
      req.body.amount,
      0
    );

    if (value <= 0) {
      return res.status(400).json({
        message: 'Profit amount must be greater than 0.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.balance =
      toNumber(user.balance, 0) + value;

    user.total_profit =
      toNumber(user.total_profit, 0) + value;

    await user.save();

    res.json({
      message: 'Profit added successfully.',
      balance: user.balance,
      total_profit: user.total_profit,
      frozen_balance: getFrozenBalance(user),
      available_balance: getAvailableBalance(user),
    });
  } catch (error) {
    console.error('ADD PROFIT ERROR:', error);

    res.status(500).json({
      message: 'Failed to add profit.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| SET CREDIT SCORE
|--------------------------------------------------------------------------
*/

router.post('/:id/set-credit-score', async (req, res) => {
  try {
    const score = parseInt(
      req.body.score,
      10
    );

    if (!Number.isFinite(score)) {
      return res.status(400).json({
        message: 'Invalid credit score.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.credit_score = score;

    await user.save();

    res.json({
      message: 'Credit score updated successfully.',
      credit_score: user.credit_score,
    });
  } catch (error) {
    console.error('SET CREDIT SCORE ERROR:', error);

    res.status(500).json({
      message: 'Failed to update credit score.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADJUST CREDIT SCORE
|--------------------------------------------------------------------------
*/

router.post('/:id/adjust-credit-score', async (req, res) => {
  try {
    const amount = parseInt(
      req.body.amount,
      10
    );

    if (!Number.isFinite(amount)) {
      return res.status(400).json({
        message: 'Invalid credit score adjustment.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.credit_score =
      toNumber(user.credit_score, 0) + amount;

    await user.save();

    res.json({
      message:
        'Credit score adjusted successfully.',
      credit_score: user.credit_score,
    });
  } catch (error) {
    console.error(
      'ADJUST CREDIT SCORE ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to adjust credit score.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| SET LOGIN PASSWORD
|--------------------------------------------------------------------------
*/

router.post('/:id/set-password', async (req, res) => {
  try {
    const password =
      String(req.body.password || '');

    if (!password || password.length < 6) {
      return res.status(400).json({
        message:
          'Password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    user.password = hashedPassword;

    await user.save();

    res.json({
      message:
        'Login password updated successfully.',
    });
  } catch (error) {
    console.error(
      'SET PASSWORD ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to update login password.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| SET WITHDRAWAL PASSWORD
|--------------------------------------------------------------------------
*/

router.post(
  '/:id/set-withdrawal-password',
  async (req, res) => {
    try {
      const withdrawalPassword =
        String(
          req.body.withdrawal_password || ''
        );

      if (
        !withdrawalPassword ||
        withdrawalPassword.length < 4
      ) {
        return res.status(400).json({
          message:
            'Withdrawal password must be at least 4 characters.',
        });
      }

      const user =
        await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          withdrawalPassword,
          12
        );

      user.withdrawal_password =
        hashedPassword;

      await user.save();

      res.json({
        message:
          'Withdrawal password updated successfully.',
      });
    } catch (error) {
      console.error(
        'SET WITHDRAWAL PASSWORD ERROR:',
        error
      );

      res.status(500).json({
        message:
          'Failed to update withdrawal password.',
        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| VERIFY / REJECT USER
|--------------------------------------------------------------------------
*/

router.post('/:id/verify', async (req, res) => {
  try {
    const status =
      String(req.body.status || '');

    const allowedStatuses = [
      'pending',
      'verified',
      'rejected',
      'unverified',
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          'Invalid identity status.',
      });
    }

    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.identity_status = status;

    await user.save();

    res.json({
      message:
        `Identity status changed to ${status}.`,
      identity_status:
        user.identity_status,
    });
  } catch (error) {
    console.error(
      'VERIFY USER ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to update identity status.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| DELETE USER
|--------------------------------------------------------------------------
*/

router.delete('/:id', async (req, res) => {
  try {
    const user =
      await User.findByIdAndDelete(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    res.json({
      message:
        'User deleted successfully.',
    });
  } catch (error) {
    console.error(
      'DELETE USER ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to delete user.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| BALANCE CHECK API
|--------------------------------------------------------------------------
*/

router.get('/:id/balance-status', async (req, res) => {
  try {
    const user =
      await User.findById(req.params.id)
        .select(
          'balance frozen_balance trading_enabled withdrawal_enabled'
        );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    res.json({
      balance:
        toNumber(user.balance, 0),

      frozen_balance:
        getFrozenBalance(user),

      available_balance:
        getAvailableBalance(user),

      trading_enabled:
        user.trading_enabled !== false,

      withdrawal_enabled:
        user.withdrawal_enabled !== false,
    });
  } catch (error) {
    console.error(
      'BALANCE STATUS ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to fetch balance status.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| TRADING CHECK
|--------------------------------------------------------------------------
*/

router.get('/:id/trading-check', async (req, res) => {
  try {
    const amount = toNumber(
      req.query.amount,
      0
    );

    const user =
      await User.findById(req.params.id)
        .select(
          'balance frozen_balance trading_enabled'
        );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    try {
      ensureTradingAllowed(
        user,
        amount
      );

      return res.json({
        allowed: true,
        balance:
          toNumber(user.balance, 0),
        frozen_balance:
          getFrozenBalance(user),
        available_balance:
          getAvailableBalance(user),
      });
    } catch (error) {
      return res.status(400).json({
        allowed: false,
        message: error.message,
        balance:
          toNumber(user.balance, 0),
        frozen_balance:
          getFrozenBalance(user),
        available_balance:
          getAvailableBalance(user),
      });
    }
  } catch (error) {
    console.error(
      'TRADING CHECK ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to check trading balance.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| WITHDRAWAL CHECK
|--------------------------------------------------------------------------
*/

router.get('/:id/withdrawal-check', async (req, res) => {
  try {
    const amount = toNumber(
      req.query.amount,
      0
    );

    const user =
      await User.findById(req.params.id)
        .select(
          'balance frozen_balance withdrawal_enabled'
        );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    try {
      ensureWithdrawalAllowed(
        user,
        amount
      );

      return res.json({
        allowed: true,
        balance:
          toNumber(user.balance, 0),
        frozen_balance:
          getFrozenBalance(user),
        available_balance:
          getAvailableBalance(user),
      });
    } catch (error) {
      return res.status(400).json({
        allowed: false,
        message: error.message,
        balance:
          toNumber(user.balance, 0),
        frozen_balance:
          getFrozenBalance(user),
        available_balance:
          getAvailableBalance(user),
      });
    }
  } catch (error) {
    console.error(
      'WITHDRAWAL CHECK ERROR:',
      error
    );

    res.status(500).json({
      message:
        'Failed to check withdrawal balance.',
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER + HELPERS
|--------------------------------------------------------------------------
*/

export {
  getAvailableBalance,
  getFrozenBalance,
  ensureTradingAllowed,
  ensureWithdrawalAllowed,
};

export default router;
```
