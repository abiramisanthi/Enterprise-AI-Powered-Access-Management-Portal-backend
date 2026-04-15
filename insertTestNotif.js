import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/Notification.js';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/access_portal')
    .then(async () => {
        const admin = await User.findOne({ role: { $in: ['ADMIN', 'APPROVER'] } });
        const requester = await User.findOne({ role: 'REQUESTER' });

        if (admin && requester) {
            // Give Admin a test notif
            await Notification.create({
                receiver_user_id: admin._id,
                sender_user_id: requester._id,
                type: 'new',
                status: 'Pending',
                message: `New test request received from ${requester.username}! You can see this notification works!`,
                icon: '🔔',
                is_read: false
            });

            // Give Requester a test notif
            await Notification.create({
                receiver_user_id: requester._id,
                sender_user_id: admin._id,
                type: 'update',
                status: 'Accepted',
                message: `Your test request has been accepted! You can see this notification works!`,
                icon: '✅',
                is_read: false
            });
            console.log('Test notifications injected successfully');
        } else {
            console.log('Could not find users to assign test notifications.');
        }
        process.exit(0);
    });
