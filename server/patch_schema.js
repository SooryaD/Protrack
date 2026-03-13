import { pool } from './db.js';

const patchSchema = async () => {
    try {
        await pool.query('ALTER TABLE projects ADD COLUMN abstract TEXT;');
        await pool.query('ALTER TABLE projects ADD COLUMN csc_status VARCHAR(50);');
        await pool.query('ALTER TABLE projects ADD COLUMN csc_comment TEXT;');
        await pool.query('ALTER TABLE projects ADD COLUMN csc_reviewed_at TIMESTAMP;');
        console.log('projects table patched successfully');
    } catch (e) {
         console.log('projects table patch error (might exist):', e.message);
    }
    
    try {
        await pool.query('ALTER TABLE guide_requests ADD COLUMN rejection_reason TEXT;');
        console.log('guide_requests table patched successfully');
    } catch (e) {
        console.log('guide_requests table patch error (might exist):', e.message);
    }

    try {
        await pool.query('ALTER TABLE project_history ADD COLUMN comment TEXT;');
        console.log('project_history table patched successfully');
    } catch (e) {
        console.log('project_history table patch error (might exist):', e.message); // user's schema actually had comment!
    }

    process.exit(0);
};

patchSchema();
