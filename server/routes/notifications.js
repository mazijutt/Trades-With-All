import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

/*
 * GET MY NOTIFICATIONS
 */
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user_email: req.user.email,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/*
 * GET ADMIN NOTIFICATIONS
 */
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user_email: 'admin',
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/*
 * ADMIN SEND NOTIFICATION
 *
 * recipient_type:
 *   - all  = send to all users
 *   - user = send to selected user
 */
router.post('/admin/send', protect, adminOnly, async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'general',
      recipient_type = 'all',
      user_id,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Notification title is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: 'Notification message is required',
      });
    }

    /*
     * SEND TO ONE USER
     */
    if (recipient_type === 'user') {
      if (!user_id) {
        return res.status(400).json({
          message: 'User ID is required',
        });
      }

      const user = await User.findById(user_id);

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

      const notification = await Notification.create({
        user_id: user._id,
        user_email: user.email,
        title: title.trim(),
        message: message.trim(),
        type,
        is_read: false,
      });

      return res.status(201).json({
        message: 'Notification sent successfully',
        count: 1,
        sent: 1,
        recipients: 1,
        notification,
      });
    }

    /*
     * SEND TO ALL USERS
     */
    if (recipient_type === 'all') {
      const users = await User.find({
        role: { $ne: 'admin' },
      }).select('_id email');

      if (users.length === 0) {
        return res.status(200).json({
          message: 'No users found',
          count: 0,
          sent: 0,
          recipients: 0,
        });
      }

      const notifications = users.map((user) => ({
        user_id: user._id,
        user_email: user.email,
        title: title.trim(),
        message: message.trim(),
        type,
        is_read: false,
      }));

      await Notification.insertMany(notifications);

      return res.status(201).json({
        message: 'Notification sent successfully',
        count: notifications.length,
        sent: notifications.length,
        recipients: notifications.length,
      });
    }

    return res.status(400).json({
      message: 'Invalid recipient type',
    });
  } catch (error) {
    console.error('Admin send notification error:', error);

    res.status(500).json({
      message: error.message || 'Failed to send notification',
    });
  }
});

/*
 * MARK ALL AS READ
 */
router.post('/mark-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user_email: req.user.email,
        is_read: false,
      },
      {
        is_read: true,
      }
    );

    res.json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/*
 * MARK ONE AS READ
 */
router.post('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found',
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

/*
 * DELETE NOTIFICATION
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(
      req.params.id
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found',
      });
    }

    res.json({
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

export default router;
