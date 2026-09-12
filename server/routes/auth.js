import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { generateToken, protect } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

const REFERRAL_BONUS = 5;

// Fixed master referral code for signup
const MASTER_REFERRAL_CODE = 'J9115UTT';

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function getUniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();

    const existing = await User.findOne({
      referral_code: code,
    });

    if (!existing) {
      return code;
    }
  }

  return (
    generateReferralCode() +
    Date.now().toString(36).toUpperCase().slice(-4)
  );
}


/* =========================
   REGISTER
========================= */

router.post('/register', async (req, res) => {
  try {
    const {
      email,
      password,
      full_name,
      referral_code,
      mobile,
      country_code,
    } = req.body;

    console.log('Register request:', email);

    // Email and password
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    // Phone details
    if (!mobile || !country_code) {
      return res.status(400).json({
        message: 'Phone number and country code are required',
      });
    }

    // Fixed referral code
    if (
      !referral_code ||
      String(referral_code).trim().toUpperCase() !==
        MASTER_REFERRAL_CODE
    ) {
      return res.status(400).json({
        message: 'Invalid referral code',
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists',
      });
    }

    // Generate unique personal referral code
    const userReferralCode =
      await getUniqueReferralCode();

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password,
      full_name: full_name || '',
      mobile: String(mobile).trim(),
      country_code: String(country_code).trim(),

      // Every user gets their own referral code
      referral_code: userReferralCode,

      // Master referral code is not a user referral
      referred_by: null,
    });

    const token = generateToken(user._id);

    console.log(
      'User registered:',
      user.email
    );

    res.status(201).json({
      token,
      user,
    });

  } catch (error) {
    console.error(
      'REGISTER ERROR:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Registration failed',
    });
  }
});


/* =========================
   LOGIN
========================= */

router.post('/login', async (req, res) => {
  try {
    console.log(
      'LOGIN REQUEST RECEIVED'
    );

    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          'Email and password are required',
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    console.log(
      'Looking for user:',
      normalizedEmail
    );

    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+password');

    if (!user) {
      console.log(
        'LOGIN FAILED: user not found'
      );

      return res.status(401).json({
        message:
          'Invalid email or password',
      });
    }

    console.log(
      'User found:',
      user.email
    );

    let isMatch = false;

    // Prefer model's comparePassword method
    if (
      typeof user.comparePassword ===
      'function'
    ) {
      isMatch =
        await user.comparePassword(
          password
        );
    } else {
      isMatch =
        await bcrypt.compare(
          password,
          user.password
        );
    }

    if (!isMatch) {
      console.log(
        'LOGIN FAILED: incorrect password'
      );

      return res.status(401).json({
        message:
          'Invalid email or password',
      });
    }

    const token =
      generateToken(user._id);

    console.log(
      'LOGIN SUCCESS:',
      user.email
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
    console.error(
      'LOGIN ERROR:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Login failed',
    });
  }
});


/* =========================
   CURRENT USER
========================= */

router.get(
  '/me',
  protect,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        );

      if (!user) {
        return res.status(404).json({
          message:
            'User not found',
        });
      }

      res.json(user);

    } catch (error) {
      console.error(
        'ME ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'Failed to get user',
      });
    }
  }
);


/* =========================
   UPDATE PROFILE
========================= */

router.put(
  '/me',
  protect,
  async (req, res) => {
    try {
      const updates = {};

      const allowed = [
        'full_name',
        'avatar',
        'date_of_birth',
        'mobile',
        'country_code',
        'language',
        'bank_name',
        'bank_account_holder',
        'bank_account_number',
        'bank_ifsc',
        'bank_branch',
      ];

      allowed.forEach((field) => {
        if (
          req.body[field] !==
          undefined
        ) {
          updates[field] =
            req.body[field];
        }
      });

      const user =
        await User.findByIdAndUpdate(
          req.user._id,
          updates,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!user) {
        return res.status(404).json({
          message:
            'User not found',
        });
      }

      res.json(user);

    } catch (error) {
      console.error(
        'UPDATE PROFILE ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'Profile update failed',
      });
    }
  }
);


/* =========================
   VERIFY OTP
========================= */

router.post(
  '/verify-otp',
  protect,
  async (req, res) => {
    try {
      const {
        otp_code,
      } = req.body;

      const user =
        await User.findById(
          req.user._id
        ).select(
          '+otp_code +otp_expires'
        );

      if (!user) {
        return res.status(404).json({
          message:
            'User not found',
        });
      }

      if (
        !user.otp_code ||
        !user.otp_expires
      ) {
        return res.status(400).json({
          message:
            'No OTP pending',
        });
      }

      if (
        Date.now() >
        user.otp_expires.getTime()
      ) {
        return res.status(400).json({
          message:
            'OTP expired',
        });
      }

      if (
        user.otp_code !==
        otp_code
      ) {
        return res.status(400).json({
          message:
            'Invalid OTP',
        });
      }

      user.is_verified = true;
      user.otp_code = undefined;
      user.otp_expires = undefined;

      await user.save();

      res.json({
        message:
          'Email verified successfully',
      });

    } catch (error) {
      console.error(
        'VERIFY OTP ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'OTP verification failed',
      });
    }
  }
);


/* =========================
   CHANGE PASSWORD
========================= */

router.post(
  '/change-password',
  protect,
  async (req, res) => {
    try {
      const {
        current_password,
        new_password,
      } = req.body;

      if (
        !current_password ||
        !new_password
      ) {
        return res.status(400).json({
          message:
            'Current and new password are required',
        });
      }

      const user =
        await User.findById(
          req.user._id
        ).select('+password');

      if (!user) {
        return res.status(404).json({
          message:
            'User not found',
        });
      }

      const isMatch =
        await user.comparePassword(
          current_password
        );

      if (!isMatch) {
        return res.status(400).json({
          message:
            'Current password is incorrect',
        });
      }

      user.password =
        new_password;

      await user.save();

      res.json({
        message:
          'Password updated successfully',
      });

    } catch (error) {
      console.error(
        'CHANGE PASSWORD ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'Password update failed',
      });
    }
  }
);


/* =========================
   SET WITHDRAWAL PASSWORD
========================= */

router.post(
  '/set-withdrawal-password',
  protect,
  async (req, res) => {
    try {
      const {
        withdrawal_password,
      } = req.body;

      if (!withdrawal_password) {
        return res.status(400).json({
          message:
            'Withdrawal password is required',
        });
      }

      const hashed =
        await bcrypt.hash(
          withdrawal_password,
          12
        );

      await User.findByIdAndUpdate(
        req.user._id,
        {
          withdrawal_password:
            hashed,
        }
      );

      res.json({
        message:
          'Withdrawal password set successfully',
      });

    } catch (error) {
      console.error(
        'SET WITHDRAWAL PASSWORD ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'Failed to set withdrawal password',
      });
    }
  }
);


/* =========================
   SUBMIT VERIFICATION
========================= */

router.post(
  '/submit-verification',
  protect,
  async (req, res) => {
    try {
      const {
        date_of_birth,
        mobile,
        country_code,
      } = req.body;

      const user =
        await User.findByIdAndUpdate(
          req.user._id,
          {
            date_of_birth:
              date_of_birth ||
              req.user.date_of_birth,

            mobile:
              mobile ||
              req.user.mobile,

            country_code:
              country_code ||
              req.user.country_code,

            identity_status:
              'pending',
          },
          {
            new: true,
          }
        );

      if (!user) {
        return res.status(404).json({
          message:
            'User not found',
        });
      }

      res.json({
        message:
          'Verification submitted successfully',
      });

    } catch (error) {
      console.error(
        'SUBMIT VERIFICATION ERROR:',
        error
      );

      res.status(500).json({
        message:
          error.message ||
          'Verification submission failed',
      });
    }
  }
);


export default router;
