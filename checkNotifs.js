import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/Notification.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/access_portal')
    .then(async () => {
        const notifs = await Notification.find();
        console.log('NOTIFS IN DB:', JSON.stringify(notifs, null, 2));
        process.exit(0);
    });
