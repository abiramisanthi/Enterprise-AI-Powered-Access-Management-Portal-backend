import express from 'express';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ receiver_user_id: req.user._id })
            .sort({ timestamp: -1 })
            .limit(20);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.put('/read-all', protect, async (req, res) => {
    try {
        await Notification.updateMany({ receiver_user_id: req.user._id, is_read: false }, { is_read: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.delete('/clear', protect, async (req, res) => {
    try {
        await Notification.deleteMany({ receiver_user_id: req.user._id });
        res.json({ message: 'Notifications cleared' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
