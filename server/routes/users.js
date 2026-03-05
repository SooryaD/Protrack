import express from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/staff  — for guide dropdown (any authenticated user)
router.get('/staff', protect, async (req, res) => {
    try {
        const users = await User.find({});
        const staffUsers = users
            .filter(u => u.role === 'staff' && u.isActive !== false)
            .map(u => ({ _id: u._id, id: u._id, name: u.name, email: u.email, role: u.role }));
        res.json(staffUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users  — Admin only
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users.map(u => ({
            _id: u._id, id: u._id,
            name: u.name, email: u.email, role: u.role,
            isActive: u.isActive,
            assignedGuideId: u.assignedGuideId || null,
            assignedGuideName: u.assignedGuideName || null,
            createdAt: u.createdAt,
        })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/users  — admin creates any user
router.post('/', protect, adminOnly, async (req, res) => {
    const { name, email, password, role, assignedGuideId, assignedGuideName } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }

    const allowed = ['student', 'staff', 'admin'];
    if (!allowed.includes(role)) {
        return res.status(400).json({ message: 'Role must be student, staff, or admin.' });
    }

    try {
        const allUsers = await User.find({});
        const emailExists = allUsers.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
        if (emailExists) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            role,
            isActive: true,
        };

        if (role === 'student' && assignedGuideId) {
            userData.assignedGuideId = assignedGuideId;
            userData.assignedGuideName = assignedGuideName || '';
        }

        const user = await User.create(userData);

        res.status(201).json({
            _id: user._id, id: user._id,
            name: user.name, email: user.email, role: user.role,
            assignedGuideId: user.assignedGuideId || null,
            assignedGuideName: user.assignedGuideName || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/users/:id  — Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete an admin account.' });
        await user.deleteOne();
        res.json({ message: 'User removed.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
