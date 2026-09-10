import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your-username')) {
      console.log('⚠️  MONGODB_URI not configured. Starting server without database connection.');
      console.log('   Login/register will fail until you set a valid MongoDB Atlas URI in server/.env');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`⚠️  MongoDB connection error: ${error.message}`);
    console.log('   Starting server without database connection. Set MONGODB_URI in server/.env to fix.');
  }
};

export default connectDB;