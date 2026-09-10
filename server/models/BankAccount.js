import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
  bank_name: { type: String, required: true },
  account_holder: { type: String, required: true },
  account_number: { type: String, required: true },
  ifsc_code: { type: String, default: '' },
  upi_id: { type: String, default: '' },
  branch: { type: String, default: '' },
  note: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('BankAccount', bankAccountSchema);