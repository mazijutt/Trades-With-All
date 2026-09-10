import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_email: { type: String, required: true },
  crypto: { type: String, required: true, uppercase: true },
  direction: { type: String, enum: ['buy', 'sell'], required: true },
  amount: { type: Number, required: true },
  entry_price: { type: Number, required: true },
  exit_price: { type: Number, default: 0 },
  duration: { type: Number, required: true },
  profit_percent: { type: Number, required: true },
  profit_loss: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'won', 'lost'], default: 'active' },
  expires_at: { type: Date, required: true },
  admin_outcome: { type: String, enum: ['won', 'lost', null], default: null },
}, { timestamps: true });

tradeSchema.index({ user_id: 1, status: 1 });
tradeSchema.index({ user_email: 1 });
tradeSchema.index({ expires_at: 1, status: 1 });

export default mongoose.model('Trade', tradeSchema);
