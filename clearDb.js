import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/access_portal')
    .then(async () => {
        console.log('Connected to DB');
        const db = mongoose.connection.db;
        try {
            await db.collection('notifications').drop();
            console.log('Notifications dropped!');
        } catch(e) {
            console.log('Already empty or error', e.message);
        }
        process.exit(0);
    });
