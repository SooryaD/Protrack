import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users/staff  — for guide dropdown (any authenticated user)
router.get('/staff', protect, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE role = ?', ['staff']);
        // Note: we're assuming all are active since isActive is omitted in schema.
        const staffUsers = rows.map(u => ({
            _id: u.id, id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            maxStudents: u.max_students ?? 2,
            currentStudentCount: u.current_student_count ?? 0
        }));
        res.json(staffUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/users  — Admin only
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        
        // Let's also fetch the names for their assigned guides manually or via join, but we can just do a map for small datasets
        // Better yet: we just query the guides if any have assigned_guide_id
        
        const [guides] = await pool.query('SELECT id, name FROM users WHERE role = ?', ['staff']);
        const guideMap = {};
        for (let g of guides) {
            guideMap[g.id] = g.name;
        }

        const usersMapped = rows.map(u => ({
            _id: u.id, id: u.id,
            name: u.name, email: u.email, role: u.role,
            isActive: true, // Assuming true
            assignedGuideId: u.assigned_guide_id || null,
            assignedGuideName: u.assigned_guide_id ? (guideMap[u.assigned_guide_id] || '') : null,
            maxStudents: u.max_students ?? 2,
            currentStudentCount: u.current_student_count ?? 0,
            createdAt: u.created_at,
        }));
        
        res.json(usersMapped);
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
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'An account with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const assignGuide = role === 'student' ? (assignedGuideId || null) : null;

        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, role, assigned_guide_id) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email.trim().toLowerCase(), hashedPassword, role, assignGuide]
        );

        let resolvedGuideName = assignedGuideName || null;
        if (assignGuide && !resolvedGuideName) {
            const [gRow] = await pool.query('SELECT name FROM users WHERE id = ?', [assignGuide]);
            if (gRow.length > 0) resolvedGuideName = gRow[0].name;
        }

        res.status(201).json({
            _id: result.insertId, id: result.insertId,
            name: name.trim(), email: email.trim().toLowerCase(), role,
            assignedGuideId: assignGuide,
            assignedGuideName: resolvedGuideName,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   DELETE /api/users/:id  — Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
        const user = rows[0];
        
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete an admin account.' });
        
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User removed.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   PUT /api/users/:id/capacity  — Admin sets staff capacity
router.put('/:id/capacity', protect, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT role, max_students FROM users WHERE id = ?', [req.params.id]);
        const user = rows[0];
        if (!user || user.role !== 'staff') {
            return res.status(404).json({ message: 'Staff member not found.' });
        }

        const { maxStudents } = req.body;
        if (typeof maxStudents !== 'number' || maxStudents < 0) {
            return res.status(400).json({ message: 'Valid maxStudents number is required.' });
        }

        await pool.query('UPDATE users SET max_students = ? WHERE id = ?', [maxStudents, req.params.id]);

        res.json({ message: 'Capacity updated.', maxStudents });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
