import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_email: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
  amount: { type: Number, required: true },
  amount_inr: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  method: { type: String, default: 'USDT_TRC20' },
  wallet_address: { type: String, default: '' },
  tx_hash: { type: String, default: '' },
  admin_note: { type: String, default: '' },
  bank_details: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

transactionSchema.index({ user_id: 1 });
transactionSchema.index({ user_email: 1 });
transactionSchema.index({ status: 1 });

export default mongoose.model('Transaction', transactionSchema);
