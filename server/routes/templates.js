import express from 'express';
import { pool } from '../db.js';
import multer from 'multer';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../cloudinary.js';

const router = express.Router();

// Multer — use memoryStorage, files are streamed to Cloudinary
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, ZIP, and DOCX files are allowed.'));
        }
    }
});

// @route   GET /api/templates
// @desc    Get all templates
// @access  Authenticated users
router.get('/', protect, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM templates ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/templates
// @desc    Upload a new template to Cloudinary
// @access  Admin only
router.post('/', protect, adminOnly, upload.single('file'), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !req.file) {
            return res.status(400).json({ message: 'Template name and file are required.' });
        }

        // Upload to Cloudinary
        const { url, public_id } = await uploadToCloudinary(req.file.buffer, {
            folder: 'protrack/templates',
            resource_type: 'auto',
            public_id: `template_${Date.now()}`,
        });

        const [result] = await pool.query(
            'INSERT INTO templates (name, description, file_path) VALUES (?, ?, ?)',
            [name, description || '', url]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            description,
            file_path: url,
            public_id,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/templates/:id
// @desc    Delete a template (from DB and Cloudinary)
// @access  Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const templateId = req.params.id;

        const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [templateId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const template = rows[0];

        // Delete from database
        await pool.query('DELETE FROM templates WHERE id = ?', [templateId]);

        // Attempt to delete from Cloudinary if it's a Cloudinary URL
        if (template.file_path && template.file_path.includes('cloudinary.com')) {
            // Extract public_id from URL  e.g. .../protrack/templates/template_123456
            const matches = template.file_path.match(/\/v\d+\/(.+)\.\w+$/);
            if (matches && matches[1]) {
                await deleteFromCloudinary(matches[1], 'auto');
            }
        }

        res.json({ message: 'Template removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
