import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // Fetch user from DB
            const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
            const user = rows[0];
            
            if (!user) {
                return res.status(401).json({ message: 'User not found. Token invalid.' });
            }

            // Fetch assigned guide name if applicable
            let assignedGuideName = null;
            if (user.assigned_guide_id) {
                const [guideRows] = await pool.query('SELECT name FROM users WHERE id = ?', [user.assigned_guide_id]);
                if (guideRows.length > 0) {
                    assignedGuideName = guideRows[0].name;
                }
            }

            req.user = {
                id: user.id,
                _id: user.id, // For backward compatibility with React client parsing _id
                name: user.name,
                email: user.email,
                role: user.role,
                rollNo: user.roll_no || null,
                assignedGuideId: user.assigned_guide_id || null,
                assignedGuideName: assignedGuideName,
                maxStudents: user.max_students || null,
                currentStudentCount: user.current_student_count || 0,
                isActive: true // Mocking isActive since it's not in the new schema
            };

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized. Token failed.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

export const staffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Staff or Admin only.' });
    }
};
