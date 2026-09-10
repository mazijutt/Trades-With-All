import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config.js';
import Trade from './models/Trade.js';
import User from './models/User.js';
import Notification from './models/Notification.js';

dotenv.config();

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

app.use(cors());
app.use(express.json());

/* =========================================================
   BASIC TEST ROUTE
========================================================= */

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Gemini Exchange API is running',
  });
});

/* =========================================================
   SOCKET.IO
========================================================= */

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined user ${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/* =========================================================
   EXPIRED TRADES
========================================================= */

const resolveExpiredTrades = async () => {
  try {
    // Make sure MongoDB is actually connected
    if (Trade.db.readyState !== 1) {
      console.log('Trade check skipped: MongoDB not connected');
      return;
    }

    const expiredTrades = await Trade.find({
      status: 'active',
      expires_at: { $lte: new Date() },
    });

    if (expiredTrades.length === 0) {
      return;
    }

    console.log(`Found ${expiredTrades.length} expired trade(s)`);

    for (const trade of expiredTrades) {
      try {
        const coinIdMap = {
          BTC: 'bitcoin',
          ETH: 'ethereum',
          BNB: 'binancecoin',
          SOL: 'solana',
          XRP: 'ripple',
          DOGE: 'dogecoin',
          ADA: 'cardano',
          DOT: 'polkadot',
        };

        const coinId = coinIdMap[trade.crypto] || 'bitcoin';

        const priceRes = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
        );

        if (!priceRes.ok) {
          throw new Error(
            `CoinGecko API returned status ${priceRes.status}`
          );
        }

        const priceData = await priceRes.json();

        const exitPrice =
          priceData[coinId]?.usd || trade.entry_price;

        let won;

        if (trade.admin_outcome) {
          won = trade.admin_outcome === 'won';
        } else {
          won =
            trade.direction === 'buy'
              ? exitPrice > trade.entry_price
              : exitPrice < trade.entry_price;
        }

        trade.exit_price = exitPrice;
        trade.status = won ? 'won' : 'lost';

        trade.profit_loss = won
          ? Math.round(
              ((trade.amount * trade.profit_percent) / 100) * 100
            ) / 100
          : -trade.amount;

        await trade.save();

        const user = await User.findById(trade.user_id);

        if (user) {
          if (won) {
            user.balance += trade.amount + trade.profit_loss;
          }

          user.total_profit += trade.profit_loss;

          await user.save();

          await Notification.create({
            user_id: user._id,
            user_email: user.email,
            title:
              trade.status === 'won'
                ? 'Trade Won!'
                : 'Trade Lost',
            message:
              `Your ${trade.direction} trade on ${trade.crypto} ` +
              `${trade.status === 'won' ? 'earned' : 'lost'} ` +
              `$${Math.abs(trade.profit_loss).toFixed(2)}`,
            type:
              trade.status === 'won'
                ? 'trade_won'
                : 'trade_lost',
            related_id: trade._id.toString(),
          });

          io.to(user._id.toString()).emit(
            'trade-resolved',
            trade
          );

          io.to(user._id.toString()).emit(
            'balance-update',
            {
              balance: user.balance,
            }
          );
        }

        console.log(
          `Trade ${trade._id} resolved: ${trade.status}`
        );
      } catch (err) {
        console.error(
          'Error resolving trade:',
          trade._id,
          err.message
        );
      }
    }
  } catch (error) {
    console.error(
      'Error in resolveExpiredTrades:',
      error.message
    );
  }
};

/* =========================================================
   START SERVER
========================================================= */

const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');

    await connectDB();

    console.log('MongoDB connected successfully');

    /* =====================================================
       API ROUTES
    ===================================================== */

    const authRoutes =
      (await import('./routes/auth.js')).default;

    const userRoutes =
      (await import('./routes/users.js')).default;

    const tradeRoutes =
      (await import('./routes/trades.js')).default;

    const transactionRoutes =
      (await import('./routes/transactions.js')).default;

    const notificationRoutes =
      (await import('./routes/notifications.js')).default;

    const walletRoutes =
      (await import('./routes/wallets.js')).default;

    const bankRoutes =
      (await import('./routes/banks.js')).default;

    const settingRoutes =
      (await import('./routes/settings.js')).default;

    const priceRoutes =
      (await import('./routes/prices.js')).default;

    const referralRoutes =
      (await import('./routes/referrals.js')).default;

    const adminRoutes =
      (await import('./routes/admin.js')).default;

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/trades', tradeRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/wallets', walletRoutes);
    app.use('/api/banks', bankRoutes);
    app.use('/api/settings', settingRoutes);
    app.use('/api/prices', priceRoutes);
    app.use('/api/referrals', referralRoutes);
    app.use('/api/admin', adminRoutes);

    /* =====================================================
       HEALTH CHECK
    ===================================================== */

    app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    });

    /* =====================================================
       404 API HANDLER
    ===================================================== */

    app.use('/api', (req, res) => {
      res.status(404).json({
        message: 'API route not found',
        path: req.originalUrl,
      });
    });

    /* =====================================================
       ERROR HANDLER
    ===================================================== */

    app.use((err, req, res, next) => {
      console.error('Express error:', err);

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        message: 'Internal server error',
        error:
          process.env.NODE_ENV === 'production'
            ? undefined
            : err.message,
      });
    });

    /* =====================================================
       START HTTP SERVER FIRST
    ===================================================== */

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });

    /* =====================================================
       EXPIRED TRADE CHECKER
       START AFTER SERVER IS READY
    ===================================================== */

    setTimeout(() => {
      console.log('Starting expired trade checker...');

      resolveExpiredTrades();

      setInterval(() => {
        resolveExpiredTrades();
      }, 5000);
    }, 3000);

  } catch (error) {
    console.error(
      'Failed to start server:',
      error
    );

    process.exit(1);
  }
};

startServer();

export { io };