import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/Notification.js';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
    .then(async () => {
        // Drop old to be absolutely safe
        try {
            await mongoose.connection.db.collection('notifications').drop();
        } catch(e) {}

        const admin = await User.findOne({ role: { $in: ['ADMIN', 'APPROVER'] } });
        const requester = await User.findOne({ role: 'REQUESTER' });

        if (admin && requester) {
            await Notification.create({
                receiver_user_id: admin._id,
                sender_user_id: requester._id,
                type: 'new',
                status: 'Pending',
                message: `New test request received from ${requester.username}! Role-based notification works.`,
                icon: '🔔',
                is_read: false
            });

            await Notification.create({
                receiver_user_id: requester._id,
                sender_user_id: admin._id,
                type: 'update',
                status: 'Accepted',
                message: `Your test request has been accepted! Access strictly isolated to requester.`,
                icon: '✅',
                is_read: false
            });
            console.log('Seeded test notifications!');
        } else {
            console.log('No users found in Atlas database.');
        }
        process.exit(0);
    });
