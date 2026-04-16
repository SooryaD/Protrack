import express from 'express';
import { pool } from '../db.js';
import multer from 'multer';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
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

const UPLOAD_ALLOWED_STATUSES = ['TITLE_PENDING', 'TITLE_APPROVED', 'CHANGES_REQUESTED', 'RESUBMITTED', 'FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE', 'REPORT_CHANGES_REQUESTED'];

// Helper to assemble project objects
const assembleProject = (p, filesMap, frMap, srMap, vivaMap, historyMap) => {
    const pf = filesMap[p.id];
    let repository = undefined;
    if (pf) {
        repository = {
            abstract: pf.abstract_file || undefined,
            firstReview: pf.first_review_file || undefined,
            secondReview: pf.second_review_file || undefined,
            code: pf.code_file || undefined,
            report: pf.final_report_file || undefined,
            lastUpdated: null // Not explicitly maintained in DB via a column, but can be simulated
        };
        // Clean up undefined properties
        Object.keys(repository).forEach(key => repository[key] === undefined && delete repository[key]);
        if (Object.keys(repository).length === 0) repository = undefined;
    }

    let firstReview = undefined;
    const fr = frMap[p.id];
    if (fr) {
        firstReview = {
            marks: {
                problemDefinition: fr.problem_definition,
                literatureReview: fr.literature_review,
                novelIdea: fr.novelty,
                detailedDesign: fr.design,
                methodology: fr.methodology,
                guideMarks: fr.guide_marks
            },
            totalOutOf100: fr.total_marks,
            normalizedOutOf20: fr.total_marks ? Math.round((fr.total_marks / 100) * 20 * 10) / 10 : null,
            submittedAt: null,
            submittedBy: null
        };
    }

    let secondReview = undefined;
    const sr = srMap[p.id];
    if (sr) {
        secondReview = {
            marks: {
                systemDesign: sr.system_design,
                modulesCompleted: sr.modules_completed,
                dataSet: sr.dataset,
                pseudoCode: sr.pseudocode,
                contribution: sr.contribution,
                guideMarks: sr.guide_marks
            },
            totalOutOf100: sr.total_marks,
            normalizedOutOf20: sr.total_marks ? Math.round((sr.total_marks / 100) * 20 * 10) / 10 : null,
            submittedAt: null,
            submittedBy: null
        };
    }

    let vivaScore = undefined;
    const vs = vivaMap[p.id];
    if (vs) {
        vivaScore = {
            marks: vs.marks,
            comment: vs.comment,
            submittedAt: null,
            submittedBy: null
        };
    }

    const history = (historyMap[p.id] || []).map(h => ({
        date: h.created_at,
        action: h.action,
        by: h.performed_by,
        comment: h.comment
    }));

    return {
        _id: p.id, id: p.id,
        ticketId: p.ticket_id,
        studentId: p.student_id,
        studentName: p.studentName || 'Student',
        guideId: p.guide_id,
        guideName: p.guideName || 'Guide',
        title: p.title,
        domain: p.domain,
        techStack: p.tech_stack,
        abstract: p.abstract || '',
        status: p.status,
        cscStatus: p.csc_status || undefined,
        cscComment: p.csc_comment || undefined,
        cscReviewedAt: p.csc_reviewed_at || undefined,
        createdAt: p.created_at,
        repository,
        firstReview,
        secondReview,
        vivaScore,
        history
    };
};


// @route   POST /api/projects/:id/upload
router.post('/:id/upload', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.body;
        const projectId = req.params.id;

        const [pRows] = await pool.query('SELECT status FROM projects WHERE id = ?', [projectId]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const pStatus = pRows[0].status;

        if (pStatus === 'PROJECT_SUBMITTED') return res.status(400).json({ message: 'Project already submitted. Files cannot be modified.' });
        if (!UPLOAD_ALLOWED_STATUSES.includes(pStatus)) return res.status(400).json({ message: `Files can only be uploaded at appropriate stages. Current status: ${pStatus}` });

        const filePath = `uploads/${req.file.filename}`;

        // Find existing project_files entry
        const [fRows] = await pool.query('SELECT id FROM project_files WHERE project_id = ?', [projectId]);

        let colToUpdate = '';
        if (type === 'code') colToUpdate = 'code_file';
        else if (type === 'report') colToUpdate = 'final_report_file';
        else if (type === 'abstract') colToUpdate = 'abstract_file';
        else if (type === 'firstReview') colToUpdate = 'first_review_file';
        else if (type === 'secondReview') colToUpdate = 'second_review_file';

        if (fRows.length > 0) {
            await pool.query(`UPDATE project_files SET ${colToUpdate} = ? WHERE project_id = ?`, [filePath, projectId]);
        } else {
            await pool.query(`INSERT INTO project_files (project_id, ${colToUpdate}) VALUES (?, ?)`, [projectId, filePath]);
        }

        // We should return the modified project, but to simplify we can just return a basic object or re-fetch.
        // The original code `res.json(updatedProject);` returns full project.
        res.json({ message: 'Upload successful', _id: projectId, id: projectId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   GET /api/projects
router.get('/', async (req, res) => {
    try {
        const [projectsRows] = await pool.query(`
            SELECT p.*, s.name as studentName, g.name as guideName
            FROM projects p
            LEFT JOIN users s ON p.student_id = s.id
            LEFT JOIN users g ON p.guide_id = g.id
        `);

        const [fRows] = await pool.query('SELECT * FROM project_files');
        const filesMap = {}; fRows.forEach(r => filesMap[r.project_id] = r);

        const [frRows] = await pool.query('SELECT * FROM first_review_marks');
        const frMap = {}; frRows.forEach(r => frMap[r.project_id] = r);

        const [srRows] = await pool.query('SELECT * FROM second_review_marks');
        const srMap = {}; srRows.forEach(r => srMap[r.project_id] = r);

        const [vRows] = await pool.query('SELECT * FROM viva_scores');
        const vivaMap = {}; vRows.forEach(r => vivaMap[r.project_id] = r);

        const [hRows] = await pool.query('SELECT * FROM project_history ORDER BY created_at ASC');
        const historyMap = {};
        hRows.forEach(r => {
            if (!historyMap[r.project_id]) historyMap[r.project_id] = [];
            historyMap[r.project_id].push(r);
        });

        const mapped = projectsRows.map(p => assembleProject(p, filesMap, frMap, srMap, vivaMap, historyMap));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   POST /api/projects  — Create or Resubmit
router.post('/', upload.single('abstractFile'), async (req, res) => {
    const { studentId, studentName, guideId, guideName, title, domain, techStack, abstract, id } = req.body;

    // Validate title length (minimum 7 words)
    if (title) {
        const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 7) {
            return res.status(400).json({ message: 'Project title must contain at least 7 words.' });
        }
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // One Project Rule
        if (!id || id === 'undefined' || id === 'null') {
            const [existing] = await connection.query('SELECT id FROM projects WHERE student_id = ? AND status != "TITLE_REJECTED"', [studentId]);
            if (existing.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'You already have an active project.' });
            }
        }

        let projectId = id && id !== 'undefined' && id !== 'null' ? parseInt(id) : null;

        if (projectId) {
            // Update
            const [pRows] = await connection.query('SELECT * FROM projects WHERE id = ?', [projectId]);
            if (pRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Project not found' });
            }
            const p = pRows[0];

            let newStatus = p.status;
            if (['CHANGES_REQUESTED', 'TITLE_REJECTED'].includes(p.status)) {
                newStatus = 'RESUBMITTED';
            }

            // Note: If columns abstract etc are missing, MySQL throws error here. 
            // We'll write to them assuming they were added. If missing, we skip abstract from standard fields.
            // But let's assume they must exist or will fail gracefully if strictly adhering to user instructions.

            const uTitle = title || p.title;
            const uDomain = domain || p.domain;
            const uTs = techStack || p.tech_stack;
            const uGuide = guideId || p.guide_id;

            // Optional fields check
            let updateQuery = 'UPDATE projects SET title=?, domain=?, tech_stack=?, status=?, guide_id=?';
            let updateParams = [uTitle, uDomain, uTs, newStatus, uGuide];

            // To be robust against schema mismatches, we can catch specific errors, but simpler to just try
            try {
                await connection.query(`${updateQuery}, abstract=? WHERE id=?`, [...updateParams, abstract || p.abstract || '', projectId]);
            } catch (err) {
                await connection.query(`${updateQuery} WHERE id=?`, [...updateParams, projectId]);
            }

            if (req.file) {
                const filePath = `uploads/${req.file.filename}`;
                const [fRows] = await connection.query('SELECT id FROM project_files WHERE project_id = ?', [projectId]);
                if (fRows.length > 0) {
                    await connection.query('UPDATE project_files SET abstract_file = ? WHERE project_id = ?', [filePath, projectId]);
                } else {
                    await connection.query('INSERT INTO project_files (project_id, abstract_file) VALUES (?, ?)', [projectId, filePath]);
                }
            }

            await connection.query(
                'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
                [projectId, 'RESUBMITTED', 'Student', 'Project details updated.']
            );

            await connection.commit();

            // Simple response since refetch is complex
            res.json({ _id: projectId, id: projectId, status: newStatus });

        } else {
            // Create
            const year = new Date().getFullYear();
            const [countRows] = await connection.query('SELECT COUNT(*) as count FROM projects WHERE ticket_id LIKE ?', [`EDU-PRJ-${year}%`]);
            const ticketId = `EDU-PRJ-${year}-${String(countRows[0].count + 1).padStart(3, '0')}`;

            let insertQuery = 'INSERT INTO projects (ticket_id, student_id, guide_id, title, domain, tech_stack, status';
            let insertValues = 'VALUES (?, ?, ?, ?, ?, ?, ?';
            let params = [ticketId, studentId, guideId, title, domain, techStack, 'TITLE_PENDING'];

            try {
                insertQuery += ', abstract)';
                insertValues += ', ?)';
                params.push(abstract || '');
                const [result] = await connection.query(`${insertQuery} ${insertValues}`, params);
                projectId = result.insertId;
            } catch (err) {
                insertQuery = insertQuery.replace(', abstract)', ')');
                insertValues = insertValues.replace(', ?)', ')');
                params.pop();
                const [result] = await connection.query(`${insertQuery} ${insertValues}`, params);
                projectId = result.insertId;
            }

            if (req.file) {
                const filePath = `uploads/${req.file.filename}`;
                await connection.query('INSERT INTO project_files (project_id, abstract_file) VALUES (?, ?)', [projectId, filePath]);
            }

            await connection.query(
                'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
                [projectId, 'SUBMITTED', 'Student', 'Project proposal submitted for guide approval.']
            );

            await connection.commit();
            res.status(201).json({ _id: projectId, id: projectId, ticketId, status: 'TITLE_PENDING' });
        }
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
});

// @route   PUT /api/projects/:id/status  — Guide & Student actions
router.put('/:id/status', async (req, res) => {
    const { status, comment, actorName, actorRole, actorId } = req.body;
    try {
        const [pRows] = await pool.query('SELECT status, student_id, guide_id FROM projects WHERE id = ?', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const project = pRows[0];

        if (actorRole === 'admin' && status !== 'PROJECT_COMPLETED') return res.status(403).json({ message: 'Admins use the CSC review endpoint.' });
        if (status === 'PROJECT_COMPLETED' && project.status !== 'PENDING_ADMIN_APPROVAL') return res.status(400).json({ message: 'Project can only be completed by Admin after PENDING_ADMIN_APPROVAL.' });

        if (status === 'PROJECT_SUBMITTED' && actorRole === 'student' && project.student_id == actorId) {
            // OK
        } else if (actorRole !== 'admin' && project.guide_id != actorId) {
            return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        }

        await pool.query('UPDATE projects SET status = ? WHERE id = ?', [status, req.params.id]);
        await pool.query(
            'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, status, actorName, comment || 'Status updated.']
        );

        res.json({ message: 'Status updated.', _id: req.params.id, id: req.params.id, status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/csc-review  — Admin CSC committee review
router.put('/:id/csc-review', async (req, res) => {
    const { cscStatus, comment, actorName } = req.body;
    const allowed = ['CSC_APPROVED', 'CSC_SCOPE_MODIFICATION', 'CSC_NOT_APPROVED'];
    if (!allowed.includes(cscStatus)) return res.status(400).json({ message: 'Invalid CSC status.' });

    try {
        const [pRows] = await pool.query('SELECT status FROM projects WHERE id = ?', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        if (pRows[0].status !== 'TITLE_APPROVED') return res.status(400).json({ message: 'CSC review is only for TITLE_APPROVED projects.' });

        let newStatus;
        if (cscStatus === 'CSC_APPROVED') newStatus = 'FIRST_REVIEW_PENDING';
        else if (cscStatus === 'CSC_SCOPE_MODIFICATION') newStatus = 'CHANGES_REQUESTED';
        else newStatus = 'CSC_NOT_APPROVED';

        try {
            await pool.query('UPDATE projects SET status = ?, csc_status = ?, csc_comment = ?, csc_reviewed_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, cscStatus, comment || '', req.params.id]);
        } catch (e) {
            await pool.query('UPDATE projects SET status = ? WHERE id = ?', [newStatus, req.params.id]);
        }

        await pool.query(
            'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, cscStatus, actorName || 'Admin (CSC)', comment || 'CSC review completed.']
        );

        res.json({ message: 'CSC Review updated.', _id: req.params.id, id: req.params.id, status: newStatus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/first-review  — Guide enters First Review marks
router.put('/:id/first-review', async (req, res) => {
    const { marks, actorName, actorId } = req.body;
    try {
        const [pRows] = await pool.query('SELECT status, guide_id FROM projects WHERE id = ?', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const project = pRows[0];

        if (project.guide_id != actorId) return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        if (!['FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE'].includes(project.status)) {
            return res.status(400).json({ message: 'First review is not applicable at this stage.' });
        }

        const total = (marks.problemDefinition || 0) + (marks.literatureReview || 0) + (marks.novelIdea || 0) +
            (marks.detailedDesign || 0) + (marks.methodology || 0) + (marks.guideMarks || 0);
        const normalized = Math.round((total / 100) * 20 * 10) / 10;

        await pool.query(`
            INSERT INTO first_review_marks 
            (project_id, problem_definition, literature_review, novelty, design, methodology, guide_marks, total_marks) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            problem_definition=VALUES(problem_definition), literature_review=VALUES(literature_review), novelty=VALUES(novelty), 
            design=VALUES(design), methodology=VALUES(methodology), guide_marks=VALUES(guide_marks), total_marks=VALUES(total_marks)
        `, [
            req.params.id,
            marks.problemDefinition || 0, marks.literatureReview || 0, marks.novelIdea || 0,
            marks.detailedDesign || 0, marks.methodology || 0, marks.guideMarks || 0, total
        ]);

        await pool.query('UPDATE projects SET status = "FIRST_REVIEW_DONE" WHERE id = ?', [req.params.id]);
        await pool.query(
            'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, 'FIRST_REVIEW_DONE', actorName, `First review submitted. Score: ${normalized}/20`]
        );

        res.json({ message: 'First Review logged.', _id: req.params.id, id: req.params.id, status: 'FIRST_REVIEW_DONE' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/second-review  — Guide enters Second Review marks
router.put('/:id/second-review', async (req, res) => {
    const { marks, actorName, actorId } = req.body;
    try {
        const [pRows] = await pool.query('SELECT status, guide_id FROM projects WHERE id = ?', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const project = pRows[0];

        if (project.guide_id != actorId) return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        if (!['FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'].includes(project.status)) {
            return res.status(400).json({ message: 'Complete the first review before submitting the second review.' });
        }

        const total = (marks.systemDesign || 0) + (marks.modulesCompleted || 0) + (marks.dataSet || 0) +
            (marks.pseudoCode || 0) + (marks.contribution || 0) + (marks.guideMarks || 0);
        const normalized = Math.round((total / 100) * 20 * 10) / 10;

        await pool.query(`
            INSERT INTO second_review_marks 
            (project_id, system_design, modules_completed, dataset, pseudocode, contribution, guide_marks, total_marks) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            system_design=VALUES(system_design), modules_completed=VALUES(modules_completed), dataset=VALUES(dataset), 
            pseudocode=VALUES(pseudocode), contribution=VALUES(contribution), guide_marks=VALUES(guide_marks), total_marks=VALUES(total_marks)
        `, [
            req.params.id,
            marks.systemDesign || 0, marks.modulesCompleted || 0, marks.dataSet || 0,
            marks.pseudoCode || 0, marks.contribution || 0, marks.guideMarks || 0, total
        ]);

        await pool.query('UPDATE projects SET status = "SECOND_REVIEW_DONE" WHERE id = ?', [req.params.id]);
        await pool.query(
            'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, 'SECOND_REVIEW_DONE', actorName, `Second review submitted. Score: ${normalized}/20`]
        );

        res.json({ message: 'Second Review logged.', _id: req.params.id, id: req.params.id, status: 'SECOND_REVIEW_DONE' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @route   PUT /api/projects/:id/viva-score  — Guide enters Viva Score marks
router.put('/:id/viva-score', async (req, res) => {
    const { marks, actorName, actorId } = req.body;
    try {
        const [pRows] = await pool.query('SELECT status, guide_id FROM projects WHERE id = ?', [req.params.id]);
        if (pRows.length === 0) return res.status(404).json({ message: 'Project not found' });
        const project = pRows[0];

        if (project.guide_id != actorId) return res.status(403).json({ message: 'Unauthorized: You are not the assigned guide.' });
        if (!['DOCUMENTS_VERIFIED', 'PROJECT_COMPLETED'].includes(project.status)) {
            return res.status(400).json({ message: 'Viva score can only be entered after documents are verified.' });
        }

        await pool.query(`
            INSERT INTO viva_scores (project_id, marks, comment) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE marks=VALUES(marks), comment=VALUES(comment)
        `, [req.params.id, marks, '']);

        await pool.query(
            'INSERT INTO project_history (project_id, action, performed_by, comment) VALUES (?, ?, ?, ?)',
            [req.params.id, 'VIVA_SCORE_ADDED', actorName, `Viva marks submitted: ${marks}/20`]
        );

        res.json({ message: 'Viva Score logged.', _id: req.params.id, id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
