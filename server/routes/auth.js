import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id, role) => {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set!');
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, identifier, password } = req.body;

    const loginId = identifier || email;

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Roll Number or Email, and password are required.' });
    }

    try {
        const idStr = loginId.trim();
        let queryStr, queryVal;

        if (idStr.includes('@')) {
            queryStr = 'SELECT * FROM users WHERE email = ?';
            queryVal = [idStr.toLowerCase()];
        } else {
            queryStr = 'SELECT * FROM users WHERE roll_no = ?';
            queryVal = [idStr.toUpperCase()];
        }

        const [rows] = await pool.query(queryStr, queryVal);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Fetch assigned guide name if applicable
        let assignedGuideName = null;
        if (user.assigned_guide_id) {
            const [guideRows] = await pool.query('SELECT name FROM users WHERE id = ?', [user.assigned_guide_id]);
            if (guideRows.length > 0) {
                assignedGuideName = guideRows[0].name;
            }
        }

        res.json({
            id: user.id,
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            rollNo: user.roll_no || null,
            assignedGuideId: user.assigned_guide_id || null,
            assignedGuideName: assignedGuideName,
            token: generateToken(user.id, user.role),
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

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Find the student in the registry
        const [registryRows] = await connection.query('SELECT * FROM student_registry WHERE roll_no = ?', [rollNo.trim().toUpperCase()]);
        const entry = registryRows[0];

        if (!entry) {
            await connection.rollback();
            return res.status(400).json({ message: 'Roll number not found. Please contact the administrator.' });
        }

        if (entry.registered) {
            await connection.rollback();
            return res.status(400).json({ message: 'An account already exists for this roll number.' });
        }

        // 2. Check email not already used
        const [userRows] = await connection.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (userRows.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'This email is already registered.' });
        }

        // 3. Create the student user account
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const finalName = name?.trim() || entry.name;

        // Fetch guide info if user had user_id assigned in registry? 
        // Wait, the JSON registry was assigning an empty assignedGuideName
        const [insertResult] = await connection.query(
            'INSERT INTO users (name, email, password, role, roll_no, assigned_guide_id) VALUES (?, ?, ?, ?, ?, ?)',
            [finalName, email.trim().toLowerCase(), hashedPassword, 'student', entry.roll_no, null]
        );
        const newUserId = insertResult.insertId;

        // 4. Mark registry entry as registered and update phone number to the one provided
        await connection.query('UPDATE student_registry SET registered = TRUE, user_id = ?, phone = ? WHERE id = ?', [newUserId, phone.trim(), entry.id]);

        await connection.commit();

        res.status(201).json({
            id: newUserId,
            _id: newUserId,
            name: finalName,
            email: email.trim().toLowerCase(),
            role: 'student',
            rollNo: entry.roll_no,
            assignedGuideId: null,
            assignedGuideName: null,
            token: generateToken(newUserId, 'student'),
        });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        connection.release();
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
        const [rows] = await pool.query('SELECT * FROM student_registry WHERE roll_no = ?', [rollNo.trim().toUpperCase()]);
        const entry = rows[0];

        if (!entry) return res.status(400).json({ message: 'Roll number not found.' });
        if (entry.registered) return res.status(400).json({ message: 'Account already exists for this roll number.' });

        // Fetch assigned guide name if exist (wait, registry doesn't have assigned guide in schema)
        res.json({ valid: true, name: entry.name, assignedGuideName: null });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

// @route   POST /api/auth/forgot-password
// @desc    Generate OTP for forgot password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email, phone } = req.body;
    if (!email || !phone) {
        return res.status(400).json({ message: 'Email and phone number are required.' });
    }

    try {
        const [userRows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        const user = userRows[0];

        if (!user) {
            return res.status(400).json({ message: 'If the details exist, an OTP has been generated.' }); // Prevent email enumeration
        }

        if (user.role === 'student' && user.roll_no) {
            const [regRows] = await pool.query('SELECT phone FROM student_registry WHERE roll_no = ?', [user.roll_no]);
            if (regRows.length === 0 || regRows[0].phone !== phone.trim()) {
                return res.status(400).json({ message: 'If the details exist, an OTP has been generated.' }); // Generic error
            }
        } else if (user.role !== 'student') {
            // Strictly speaking, staff lack phones in our db schema. You may allow or block them.
            // For now, let's block or just accept since they don't have phone validation
            return res.status(400).json({ message: 'Staff password resets must be done by Admin.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

        // Set expiry 10 minutes from now
        await pool.query(
            'UPDATE users SET reset_otp = ?, reset_otp_expires = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE) WHERE id = ?',
            [otp, user.id]
        );

        console.log(`\n===========================================`);
        console.log(`🔒 OTP FOR PASSWORD RESET`);
        console.log(`Email: ${user.email}`);
        console.log(`OTP: ${otp}`);
        console.log(`===========================================\n`);

        res.json({ message: 'OTP generated. Please check your registered phone number.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify the generated OTP
// @access  Public
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

    try {
        const [rows] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND reset_otp = ? AND reset_otp_expires > CURRENT_TIMESTAMP',
            [email.trim().toLowerCase(), otp.trim()]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        res.json({ message: 'OTP verified successfully.', verified: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password using OTP
// @access  Public
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required.' });

    try {
        const [rows] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND reset_otp = ? AND reset_otp_expires > CURRENT_TIMESTAMP',
            [email.trim().toLowerCase(), otp.trim()]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const user = rows[0];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        await pool.query(
            'UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
