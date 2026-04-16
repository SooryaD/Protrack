import express from 'express';
import { pool } from '../db.js';
import multer from 'multer';
import { protect, adminOnly } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Setup multer for template uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/templates/';
        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const upload = multer({
    storage,
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
// @access  Public (so students and staff can view them)
router.get('/', protect, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM templates ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/templates
// @desc    Upload a new template
// @access  Admin only
router.post('/', protect, adminOnly, upload.single('file'), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !req.file) {
            return res.status(400).json({ message: 'Template name and file are required.' });
        }

        const filePath = `uploads/templates/${req.file.filename}`;

        const [result] = await pool.query(
            'INSERT INTO templates (name, description, file_path) VALUES (?, ?, ?)',
            [name, description || '', filePath]
        );

        res.status(201).json({
            id: result.insertId,
            name,
            description,
            file_path: filePath
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   DELETE /api/templates/:id
// @desc    Delete a template
// @access  Admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const templateId = req.params.id;

        // Find the template to get the file path
        const [rows] = await pool.query('SELECT * FROM templates WHERE id = ?', [templateId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        const template = rows[0];

        // Delete from database
        await pool.query('DELETE FROM templates WHERE id = ?', [templateId]);

        // Attempt to delete file from disk
        const fullPath = path.resolve(template.file_path);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        res.json({ message: 'Template removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
