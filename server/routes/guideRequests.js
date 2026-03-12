import express from 'express';
import GuideRequest from '../models/GuideRequest.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── POST /api/guide-requests  (Student sends a request) ──────────────
router.post('/', protect, async (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can send guide requests.' });

    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ message: 'Staff ID is required.' });

    try {
        // Check student doesn't already have a guide
        const student = await User.findById(req.user.id);
        if (student.assignedGuideId) {
            return res.status(400).json({ message: 'You already have an assigned guide.' });
        }

        // Check student doesn't already have a pending/accepted request
        const existingReq = await GuideRequest.findOne({ studentId: req.user.id, status: { $ne: 'rejected' } });
        if (existingReq) {
            return res.status(400).json({ message: 'You already have a pending or accepted guide request.' });
        }

        // Check staff exists and has capacity
        const staff = await User.findById(staffId);
        if (!staff || staff.role !== 'staff') return res.status(404).json({ message: 'Staff member not found.' });

        const max = staff.maxStudents ?? 2;
        const current = staff.currentStudentCount ?? 0;
        if (current >= max) {
            return res.status(400).json({ message: 'This guide is already at full capacity.' });
        }

        const guideReq = await GuideRequest.create({
            studentId: req.user.id,
            studentName: student.name,
            rollNo: student.rollNo || '',
            staffId,
            staffName: staff.name,
            status: 'pending',
            rejectionReason: '',
        });

        res.status(201).json(guideReq);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/mine  (Student sees their own request) ────
router.get('/mine', protect, async (req, res) => {
    try {
        const requests = await GuideRequest.find({ studentId: req.user.id });
        // Return the latest one
        const latest = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
        res.json(latest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/incoming  (Staff sees requests for them) ──
router.get('/incoming', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    try {
        const requests = await GuideRequest.find({ staffId: req.user.id });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/guide-requests/all  (Admin sees all) ─────────────────────
router.get('/all', protect, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
    try {
        const requests = await GuideRequest.find({});
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── PUT /api/guide-requests/:id/accept  (Staff accepts) ───────────────
router.put('/:id/accept', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    try {
        const guideReq = await GuideRequest.findById(req.params.id);
        if (!guideReq) return res.status(404).json({ message: 'Request not found.' });
        if (guideReq.staffId !== req.user.id) return res.status(403).json({ message: 'Not your request.' });
        if (guideReq.status !== 'pending') return res.status(400).json({ message: 'Request is no longer pending.' });

        // Check capacity again
        const staff = await User.findById(req.user.id);
        const max = staff.maxStudents ?? 2;
        const current = staff.currentStudentCount ?? 0;
        if (current >= max) {
            return res.status(400).json({ message: 'You are already at full capacity.' });
        }

        // Update guide request
        guideReq.status = 'accepted';
        await guideReq.save();

        // Assign guide to student
        const student = await User.findById(guideReq.studentId);
        if (student) {
            student.assignedGuideId = req.user.id;
            student.assignedGuideName = staff.name;
            await student.save();
        }

        // Increment staff's student count
        staff.currentStudentCount = current + 1;
        await staff.save();

        res.json({ message: 'Request accepted.', request: guideReq });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── PUT /api/guide-requests/:id/reject  (Staff rejects) ───────────────
router.put('/:id/reject', protect, async (req, res) => {
    if (req.user.role !== 'staff') return res.status(403).json({ message: 'Staff only.' });
    try {
        const guideReq = await GuideRequest.findById(req.params.id);
        if (!guideReq) return res.status(404).json({ message: 'Request not found.' });
        if (guideReq.staffId !== req.user.id) return res.status(403).json({ message: 'Not your request.' });
        if (guideReq.status !== 'pending') return res.status(400).json({ message: 'Request is no longer pending.' });

        guideReq.status = 'rejected';
        guideReq.rejectionReason = req.body.reason || 'No reason provided.';
        await guideReq.save();

        res.json({ message: 'Request rejected.', request: guideReq });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
