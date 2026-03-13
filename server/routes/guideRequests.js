import express from 'express';
import { pool } from '../db.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to map DB row to API JSON format expected by frontend
const mapGuideRequest = (r) => ({
    _id: r.id, id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    rollNo: r.student_rollNo,
    staffId: r.guide_id,
    staffName: r.guide_name,
    status: r.status,
    rejectionReason: r.rejection_reason || '',
    createdAt: r.request_date
});

// Since the provided schema missing some fields like studentName, staffName, rejectionReason, 
// we will join with the users table to get names dynamically, and just return rejectionReason if we added it, 
// but since the CREATE TABLE didn't have rejection_reason, we'll map gracefully.
const getFullRequestQuery = `
    SELECT gr.*, s.name as student_name, s.roll_no as student_rollNo, g.name as guide_name
    FROM guide_requests gr
    JOIN users s ON gr.student_id = s.id
    JOIN users g ON gr.guide_id = g.id
`;

// ── POST /api/guide-requests  (Student sends a request) ──────────────
router.post('/', protect, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can send guide requests.' });

    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ message: 'Staff ID is required.' });

    try {
        // Check student doesn't already have a guide
        const [sRows] = await pool.query('SELECT assigned_guide_id, name, roll_no FROM users WHERE id = ?', [req.user.id]);
        const student = sRows[0];

        if (student.assigned_guide_id) {
            return res.status(400).json({ message: 'You already have an assigned guide.' });
        }

        // Check student doesn't already have a pending/accepted request
        const [existing] = await pool.query('SELECT id FROM guide_requests WHERE student_id = ? AND status != "rejected"', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You already have a pending or accepted guide request.' });
        }

        // Check staff exists and has capacity
        const [gRows] = await pool.query('SELECT role, max_students, current_student_count, name FROM users WHERE id = ?', [staffId]);
        const staff = gRows[0];
        
        if (!staff || staff.role !== 'staff') return res.status(404).json({ message: 'Staff member not found.' });

        const max = staff.max_students ?? 2;
        const current = staff.current_student_count ?? 0;
        if (current >= max) {
            return res.status(400).json({ message: 'This guide is already at full capacity.' });
        }

        const [insert] = await pool.query(
            'INSERT INTO guide_requests (student_id, guide_id, status) VALUES (?, ?, ?)',
            [req.user.id, staffId, 'pending']
        );

        res.status(201).json({
            _id: insert.insertId, id: insert.insertId,
            studentId: req.user.id,
            studentName: student.name,
            rollNo: student.rollNo || '',
            staffId,
            staffName: staff.name,
            status: 'pending',
            rejectionReason: '',
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/mine  (Student sees their own request) ────
router.get('/mine', protect, async (req, res) => {
    try {
        const [rows] = await pool.query(`${getFullRequestQuery} WHERE gr.student_id = ? ORDER BY gr.request_date DESC LIMIT 1`, [req.user.id]);
        if (rows.length === 0) return res.json(null);
        res.json(mapGuideRequest(rows[0]));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/incoming  (Staff sees requests for them) ──
router.get('/incoming', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    try {
        const [rows] = await pool.query(`${getFullRequestQuery} WHERE gr.guide_id = ?`, [req.user.id]);
        res.json(rows.map(mapGuideRequest));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/all  (Admin sees all) ─────────────────────
router.get('/all', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
    try {
        const [rows] = await pool.query(getFullRequestQuery);
        res.json(rows.map(mapGuideRequest));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── PUT /api/guide-requests/:id/accept  (Staff accepts) ───────────────
router.put('/:id/accept', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [reqRows] = await connection.query('SELECT * FROM guide_requests WHERE id = ? FOR UPDATE', [req.params.id]);
        const guideReq = reqRows[0];
        
        if (!guideReq) {
            await connection.rollback();
            return res.status(404).json({ message: 'Request not found.' });
        }
        if (guideReq.guide_id !== req.user.id) {
            await connection.rollback();
            return res.status(403).json({ message: 'Not your request.' });
        }
        if (guideReq.status !== 'pending') {
            await connection.rollback();
            return res.status(400).json({ message: 'Request is no longer pending.' });
        }

        // Check capacity again
        const [staffRows] = await connection.query('SELECT max_students, current_student_count, name FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
        const staff = staffRows[0];
        
        const max = staff.max_students ?? 2;
        const current = staff.current_student_count ?? 0;
        if (current >= max) {
            await connection.rollback();
            return res.status(400).json({ message: 'You are already at full capacity.' });
        }

        // Update guide request
        await connection.query('UPDATE guide_requests SET status = "approved" WHERE id = ?', [req.params.id]);

        // Assign guide to student
        await connection.query('UPDATE users SET assigned_guide_id = ? WHERE id = ?', [req.user.id, guideReq.student_id]);

        // Increment staff's student count
        await connection.query('UPDATE users SET current_student_count = current_student_count + 1 WHERE id = ?', [req.user.id]);

        await connection.commit();

        res.json({ message: 'Request accepted.' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        connection.release();
    }
});

// ── PUT /api/guide-requests/:id/reject  (Staff rejects) ───────────────
router.put('/:id/reject', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    try {
        const [reqRows] = await pool.query('SELECT * FROM guide_requests WHERE id = ?', [req.params.id]);
        const guideReq = reqRows[0];
        
        if (!guideReq) return res.status(404).json({ message: 'Request not found.' });
        if (guideReq.guide_id !== req.user.id) return res.status(403).json({ message: 'Not your request.' });
        if (guideReq.status !== 'pending') return res.status(400).json({ message: 'Request is no longer pending.' });

        // the rejection_reason isn't in original schema but if they added it later... 
        // fallback in the JSON response anyway. Let's assume it might not be there so we don't crash.
        // wait, I can just update the status safely.
        await pool.query('UPDATE guide_requests SET status = "rejected" WHERE id = ?', [req.params.id]);

        res.json({ message: 'Request rejected.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
