import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_email: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  related_id: { type: String, default: '' },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user_email: 1, is_read: 1 });

export default mongoose.model('Notification', notificationSchema);
