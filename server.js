import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/*
  Load environment variables from .env
*/
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
    path: join(__dirname, '.env')
});

/*
  DEBUG: confirms environment variables are loaded
*/
console.log("GROQ KEY EXISTS:", !!process.env.GROQ_API_KEY);
console.log("KEY VALUE:", process.env.GROQ_API_KEY);

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import User from './models/User.js';

/*
  Connect to MongoDB
*/
connectDB();

const app = express();
const httpServer = createServer(app);

//
// Socket.io Setup
//
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.set('io', io);

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User
            .findById(decoded.id)
            .select('-password');

        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = user;

        next();

    } catch (err) {

        next(new Error('Authentication error'));

    }
});

io.on('connection', (socket) => {

    const user = socket.user;

    console.log(
        `🔌 Socket connected: ${user.username} (${user.role})`
    );

    socket.join(user._id.toString());

    if (
        user.role === 'APPROVER' ||
        user.role === 'ADMIN'
    ) {
        socket.join('approvers');
    }

    socket.on('disconnect', () => {

        console.log(
            `🔌 Socket disconnected: ${user.username}`
        );

    });

});

//
// Security Middleware
//
app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

//
// Rate Limiting
//
const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,
    max: 200,

    message:
        'Too many requests from this IP, please try again after 15 minutes'

});

app.use(limiter);

//
// CORS
//
//
// CORS
//
app.use(
    cors({
        origin: [
            "https://fsd05-frontend.onrender.com",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
            "http://localhost:62193",      // Match the port in your screenshot
            "http://127.0.0.1:62193",      // Match the port in your screenshot
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ],
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],
        credentials: true
    })
);

app.options("*", cors());



//
// Body parsing
//
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//
// Routes
//
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);

//
// Root route
//
app.get('/', (req, res) => {

    res.json({
        message:
            '🚀 Access Request Management API — Enterprise AI Edition',

        version: '2.0.0',

        features: [
            'AI Validation',
            'ML Risk Scoring',
            'Real-time Notifications',
            'Analytics',
            'Audit Logs'
        ]
    });

});

//
// Error handling
//
app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(500).json({
        message: 'Something went wrong!',
        error: err.message
    });

});

const PORT =
    process.env.PORT || 5000;

httpServer.listen(
    PORT,
    '0.0.0.0',
    () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🤖 AI features: ${process.env.OPENAI_API_KEY
                ? 'ENABLED'
                : 'FALLBACK MODE'
            }`
        );

        console.log(
            `🧠 ML service: ${process.env.ML_SERVICE_URL ||
            'http://127.0.0.1:5001'
            }`
        );

    }
);