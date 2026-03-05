import express from 'express';
import Project from '../models/Project.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const UPLOAD_ALLOWED_STATUSES = ['TITLE_APPROVED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'];

// @route   POST /api/projects/:id/upload
router.post('/:id/upload', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.status === 'PROJECT_SUBMITTED') return res.status(400).json({ message: 'Project already submitted. Files cannot be modified.' });
        if (!UPLOAD_ALLOWED_STATUSES.includes(project.status)) return res.status(400).json({ message: `Files can only be uploaded after title is approved. Current status: ${project.status}` });

        const filePath = `uploads/${req.file.filename}`;
        if (!project.repository) project.repository = {};
        if (type === 'code') project.repository.code = filePath;
        else if (type === 'report') project.repository.report = filePath;
        project.repository.lastUpdated = new Date();

        const updatedProject = await project.save();
        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/projects
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find({});
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/projects  — Create or Resubmit
router.post('/', async (req, res) => {
    const { studentId, studentName, guideId, guideName, title, domain, techStack, abstract, id } = req.body;

    // Validate title length (minimum 7 words)
    if (title) {
        const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 7) {
            return res.status(400).json({ message: 'Project title must contain at least 7 words.' });
        }
    }

    // One Project Rule
    if (!id) {
        const existingProject = await Project.findOne({
            studentId,
            status: { $ne: 'TITLE_REJECTED' }
        });
        if (existingProject) {
            return res.status(400).json({ message: 'You already have an active project.' });
        }
    }

    // Generate Ticket ID
    let ticketId;
    if (!id) {
        const year = new Date().getFullYear();
        const count = await Project.countDocuments({ ticketId: { $regex: `^EDU-PRJ-${year}` } });
        ticketId = `EDU-PRJ-${year}-${String(count + 1).padStart(3, '0')}`;
    }

    if (id) {
        const project = await Project.findById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        project.title = title || project.title;
        project.domain = domain || project.domain;
        project.techStack = techStack || project.techStack;
        project.abstract = abstract || project.abstract;
        if (guideId) { project.guideId = guideId; project.guideName = guideName; }

        if (['CHANGES_REQUESTED', 'TITLE_REJECTED'].includes(project.status)) {
            project.status = 'RESUBMITTED';
        }

        project.history.push({ date: new Date(), action: 'RESUBMITTED', by: 'Student', comment: 'Project details updated.' });
        return res.json(await project.save());
    } else {
        const project = new Project({
            ticketId, studentId, studentName, guideId, guideName,
            title, domain, techStack, abstract,
            status: 'TITLE_PENDING',
            history: [{ date: new Date(), action: 'SUBMITTED', by: 'Student', comment: 'Project proposal submitted for guide approval.' }]
        });
        res.status(201).json(await project.save());
    }
});

// @route   PUT /api/projects/:id/status  — Guide & Student actions
router.put('/:id/status', async (req, res) => {
    const { status, comment, actorName, actorRole, actorId } = req.body;
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (actorRole === 'admin') return res.status(403).json({ message: 'Admins use the CSC review endpoint.' });
        if (status === 'PROJECT_COMPLETED' && project.status !== 'DOCUMENTS_VERIFIED') return res.status(400).json({ message: 'Project can only be completed after documents are verified.' });
        if (status === 'PROJECT_SUBMITTED' && actorRole === 'student' && project.studentId === actorId) {
            // OK — student submitting their own project
        } else if (project.guideId.toString() !== actorId) {
            return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        }

        project.status = status;
        project.history.push({ date: new Date(), action: status, by: actorName, comment: comment || 'Status updated.' });
        res.json(await project.save());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/csc-review  — Admin CSC committee review
// Statuses: CSC_APPROVED | CSC_SCOPE_MODIFICATION | CSC_NOT_APPROVED
router.put('/:id/csc-review', async (req, res) => {
    const { cscStatus, comment, actorName } = req.body;
    const allowed = ['CSC_APPROVED', 'CSC_SCOPE_MODIFICATION', 'CSC_NOT_APPROVED'];
    if (!allowed.includes(cscStatus)) return res.status(400).json({ message: 'Invalid CSC status.' });

    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (project.status !== 'TITLE_APPROVED') return res.status(400).json({ message: 'CSC review is only for TITLE_APPROVED projects.' });

        project.cscStatus = cscStatus;
        project.cscComment = comment || '';
        project.cscReviewedAt = new Date();

        if (cscStatus === 'CSC_APPROVED') {
            project.status = 'FIRST_REVIEW_PENDING';
        } else if (cscStatus === 'CSC_SCOPE_MODIFICATION') {
            project.status = 'CHANGES_REQUESTED';
        } else {
            project.status = 'CSC_NOT_APPROVED';
        }

        project.history.push({ date: new Date(), action: cscStatus, by: actorName || 'Admin (CSC)', comment: comment || 'CSC review completed.' });
        res.json(await project.save());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/first-review  — Guide enters First Review marks
router.put('/:id/first-review', async (req, res) => {
    const { marks, actorName, actorId } = req.body;
    // marks = { problemDefinition, literatureReview, novelIdea, detailedDesign, methodology, guideMarks }
    // Max: 10+15+5+10+30+30 = 100, normalized to 20
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.guideId.toString() !== actorId) return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        if (!['FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE'].includes(project.status)) {
            return res.status(400).json({ message: 'First review is not applicable at this stage.' });
        }

        const total = (marks.problemDefinition || 0) + (marks.literatureReview || 0) + (marks.novelIdea || 0) +
            (marks.detailedDesign || 0) + (marks.methodology || 0) + (marks.guideMarks || 0);
        const normalized = Math.round((total / 100) * 20 * 10) / 10; // out of 20

        project.firstReview = {
            marks,
            totalOutOf100: total,
            normalizedOutOf20: normalized,
            submittedAt: new Date(),
            submittedBy: actorName
        };
        project.status = 'FIRST_REVIEW_DONE';
        project.history.push({ date: new Date(), action: 'FIRST_REVIEW_DONE', by: actorName, comment: `First review submitted. Score: ${normalized}/20` });
        res.json(await project.save());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/second-review  — Guide enters Second Review marks
router.put('/:id/second-review', async (req, res) => {
    const { marks, actorName, actorId } = req.body;
    // marks = { systemDesign, modulesCompleted, dataSet, pseudoCode, contribution, guideMarks }
    // Max: 10+30+15+5+10+30 = 100, normalized to 20
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.guideId.toString() !== actorId) return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        if (!['FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'].includes(project.status)) {
            return res.status(400).json({ message: 'Complete the first review before submitting the second review.' });
        }

        const total = (marks.systemDesign || 0) + (marks.modulesCompleted || 0) + (marks.dataSet || 0) +
            (marks.pseudoCode || 0) + (marks.contribution || 0) + (marks.guideMarks || 0);
        const normalized = Math.round((total / 100) * 20 * 10) / 10; // out of 20

        project.secondReview = {
            marks,
            totalOutOf100: total,
            normalizedOutOf20: normalized,
            submittedAt: new Date(),
            submittedBy: actorName
        };
        project.status = 'SECOND_REVIEW_DONE';
        project.history.push({ date: new Date(), action: 'SECOND_REVIEW_DONE', by: actorName, comment: `Second review submitted. Score: ${normalized}/20` });
        res.json(await project.save());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
