import mongoose from 'mongoose';

const fixedDepositSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  short_name: { type: String, default: '', trim: true },
  interest_rate: { type: Number, required: true, min: 0 },
  tenure: { type: String, required: true, trim: true },
  min_amount: { type: Number, default: 500, min: 0 },
  max_amount: { type: Number, default: 0, min: 0 },
  payout: { type: String, default: 'At maturity', trim: true },
  description: { type: String, default: '', trim: true },
  is_active: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('FixedDeposit', fixedDepositSchema);
