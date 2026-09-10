import mongoose from 'mongoose';

const walletAddressSchema = new mongoose.Schema({
  currency: { type: String, required: true },
  address: { type: String, required: true },
  label: { type: String, default: '' },
  network: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('WalletAddress', walletAddressSchema);
