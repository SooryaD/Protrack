import express from 'express';
import User from '../models/User.js';
import StudentRegistry from '../models/StudentRegistry.js';
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
            rollNo: user.rollNo || null,
            assignedGuideId: user.assignedGuideId || null,
            assignedGuideName: user.assignedGuideName || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/register
// @desc    Student self-registration — verify Roll No + Phone, then create account
// @access  Public
router.post('/register', async (req, res) => {
    const { rollNo, phone, email, password, name } = req.body;

    if (!rollNo || !phone || !email || !password) {
        return res.status(400).json({ message: 'Roll number, phone, email and password are required.' });
    }

    try {
        // 1. Find the student in the registry
        const entry = await StudentRegistry.findOne({ rollNo: rollNo.trim().toUpperCase() });

        if (!entry) {
            return res.status(400).json({ message: 'Roll number not found. Please contact the administrator.' });
        }

        if (entry.phone !== phone.trim()) {
            return res.status(400).json({ message: 'Phone number does not match our records.' });
        }

        if (entry.registered) {
            return res.status(400).json({ message: 'An account already exists for this roll number.' });
        }

        // 2. Check email not already used
        const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
        if (emailExists) {
            return res.status(400).json({ message: 'This email is already registered.' });
        }

        // 3. Create the student user account
        const user = await User.create({
            name: name?.trim() || entry.name,
            email: email.trim().toLowerCase(),
            password,
            role: 'student',
            rollNo: entry.rollNo,
            phone: entry.phone,
            assignedGuideId: entry.assignedGuideId || null,
            assignedGuideName: entry.assignedGuideName || '',
            isActive: true,
        });

        // 4. Mark registry entry as registered
        entry.registered = true;
        entry.userId = user._id;
        await entry.save();

        res.status(201).json({
            id: user._id,
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            rollNo: user.rollNo,
            assignedGuideId: user.assignedGuideId || null,
            assignedGuideName: user.assignedGuideName || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/verify-student
// @desc    Check if a roll no + phone is valid and not yet registered
// @access  Public
router.post('/verify-student', async (req, res) => {
    const { rollNo, phone } = req.body;
    if (!rollNo || !phone) {
        return res.status(400).json({ message: 'Roll number and phone are required.' });
    }
    try {
        const entry = await StudentRegistry.findOne({ rollNo: rollNo.trim().toUpperCase() });
        if (!entry) return res.status(400).json({ message: 'Roll number not found.' });
        if (entry.phone !== phone.trim()) return res.status(400).json({ message: 'Phone number does not match.' });
        if (entry.registered) return res.status(400).json({ message: 'Account already exists for this roll number.' });
        res.json({ valid: true, name: entry.name, assignedGuideName: entry.assignedGuideName });
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

