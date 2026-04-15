import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/access_portal')
    .then(async () => {
        const users = await User.find();
        console.log(users.map(u => ({ id: u._id, username: u.username, role: u.role })));
        process.exit(0);
    });
