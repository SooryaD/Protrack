import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });

// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        if (user.isActive === false) {
            return res.status(401).json({ message: 'Account is disabled. Contact the administrator.' });
        }

        res.json({
            id: user._id,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            assignedGuideId: user.assignedGuideId || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

export default router;
