import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { username, email, password, role, department } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email or username' });
        }

        const user = await User.create({ username, email, password, role, department: department || 'General' });

        if (user) {
            await AuditLog.create({
                user: user._id,
                username: user.username,
                action: 'USER_REGISTER',
                details: `New user registered with role ${user.role}`,
                ipAddress: req.ip
            });

            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            await AuditLog.create({
                user: user._id,
                username: user.username,
                action: 'USER_LOGIN',
                details: `User logged in (${user.role})`,
                ipAddress: req.ip
            });

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                department: user.department,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Logout (audit only — JWT is stateless)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
    try {
        await AuditLog.create({
            user: req.user._id,
            username: req.user.username,
            action: 'USER_LOGOUT',
            details: 'User logged out',
            ipAddress: req.ip
        });
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
