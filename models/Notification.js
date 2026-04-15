import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    receiver_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String }, 
    status: { type: String }, // 'Accepted', 'Rejected', 'Pending'
    message: { type: String, required: true },
    icon: { type: String, default: '🔔' },
    is_read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', notificationSchema);
