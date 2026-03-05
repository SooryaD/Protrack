import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * protect - Verifies JWT Bearer token and attaches decoded user to req.user
 */
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // Fetch user from DB and attach (exclude sensitive fields)
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'User not found. Token invalid.' });
            }

            // Attach safe user object — no password, no reset tokens
            req.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                assignedGuideId: user.assignedGuideId || null,
                isActive: user.isActive,
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

/**
 * adminOnly - Allows only admin role
 */
export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admins only.' });
    }
};

/**
 * staffOrAdmin - Allows staff or admin roles
 */
export const staffOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Staff or Admin only.' });
    }
};
