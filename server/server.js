import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './db.js';

// Route Imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import guideRequestRoutes from './routes/guideRequests.js';
import templateRoutes from './routes/templates.js';

dotenv.config();

// Startup guard — fail fast if required env vars are missing
if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is not set. Server will not start.');
    process.exit(1);
}

// Connect Database
connectDB();

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to your frontend domain
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));

// Body parser
app.use(express.json());

// Static uploads
app.use('/uploads', express.static('uploads'));

// Rate limiting — auth routes (20 requests per 15 min per IP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' }
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/guide-requests', guideRequestRoutes);
app.use('/api/templates', templateRoutes);

// Base Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
