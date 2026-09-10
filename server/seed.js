import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import WalletAddress from './models/WalletAddress.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await WalletAddress.deleteMany({});

    const admin = await User.create({
      email: 'admin@geminiexchange.com',
      password: 'admin123',
      full_name: 'Admin User',
      role: 'admin',
      balance: 0,
      is_verified: true,
      credit_score: 1000,
      identity_status: 'verified',
    });

    const user1 = await User.create({
      email: 'user@geminiexchange.com',
      password: 'user123',
      full_name: 'John Trader',
      role: 'user',
      balance: 5000,
      total_deposited: 5000,
      is_verified: true,
      credit_score: 450,
      identity_status: 'verified',
      premium_enabled: true,
    });

    const user2 = await User.create({
      email: 'demo@geminiexchange.com',
      password: 'demo123',
      full_name: 'Demo User',
      role: 'user',
      balance: 1000,
      total_deposited: 1000,
      is_verified: true,
      credit_score: 250,
      identity_status: 'verified',
    });

    await WalletAddress.insertMany([
      { currency: 'USDT_TRC20', address: 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', label: 'USDT TRC20 Main', network: 'TRC20' },
      { currency: 'USDT_ERC20', address: '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', label: 'USDT ERC20 Main', network: 'ERC20' },
      { currency: 'BTC', address: '1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', label: 'BTC Main', network: 'Bitcoin' },
      { currency: 'ETH', address: '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', label: 'ETH Main', network: 'Ethereum' },
      { currency: 'USDC', address: '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', label: 'USDC Main', network: 'Ethereum' },
    ]);

    console.log('Seed completed!');
    console.log('Admin: admin@geminiexchange.com / admin123');
    console.log('User (Premium): user@geminiexchange.com / user123');
    console.log('User (Regular): demo@geminiexchange.com / demo123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
