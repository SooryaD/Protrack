/**
 * fresh_reset.js
 * ─────────────────────────────────────────────────────────────────
 * Resets ProTrack to a fresh state while keeping Admin & Staff accounts.
 *
 * DELETES:
 *   • All student user accounts
 *   • All projects, project files, project history
 *   • All review marks (first, second, viva)
 *   • All guide requests
 *
 * RESETS:
 *   • student_registry → registered = 0, user_id = NULL
 *   • staff users      → current_student_count = 0, assigned_guide_id = NULL
 *
 * KEEPS:
 *   • Admin accounts
 *   • Staff accounts
 *   • Student registry roll numbers & names (just marks them unregistered)
 * ─────────────────────────────────────────────────────────────────
 */

import { pool } from './db.js';
import connectDB from './db.js';

await connectDB();

const line = '─'.repeat(55);

console.log(`\n${line}`);
console.log('  🔄  ProTrack Fresh Reset');
console.log(line);

try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // ── 1. Delete all project-related data ────────────────────────
    await pool.query('TRUNCATE TABLE viva_scores');
    console.log('  🗑️   Cleared: viva_scores');

    await pool.query('TRUNCATE TABLE second_review_marks');
    console.log('  🗑️   Cleared: second_review_marks');

    await pool.query('TRUNCATE TABLE first_review_marks');
    console.log('  🗑️   Cleared: first_review_marks');

    await pool.query('TRUNCATE TABLE project_history');
    console.log('  🗑️   Cleared: project_history');

    await pool.query('TRUNCATE TABLE project_files');
    console.log('  🗑️   Cleared: project_files');

    await pool.query('TRUNCATE TABLE projects');
    console.log('  🗑️   Cleared: projects');

    // ── 2. Delete all guide requests ──────────────────────────────
    await pool.query('TRUNCATE TABLE guide_requests');
    console.log('  🗑️   Cleared: guide_requests');

    // ── 3. Delete all student user accounts ───────────────────────
    const [delResult] = await pool.query("DELETE FROM users WHERE role = 'student'");
    console.log(`  🗑️   Deleted: ${delResult.affectedRows} student user account(s)`);

    // ── 4. Reset student_registry (mark all as unregistered) ──────
    await pool.query(`
        UPDATE student_registry
        SET registered = 0,
            user_id    = NULL
        WHERE 1=1
    `);
    const [regRows] = await pool.query('SELECT COUNT(*) AS cnt FROM student_registry');
    console.log(`  ✅  Reset: ${regRows[0].cnt} student registry entries → unregistered`);

    // ── 5. Reset staff student counts ─────────────────────────────
    await pool.query(`
        UPDATE users
        SET current_student_count = 0,
            assigned_guide_id     = NULL
        WHERE role = 'staff'
    `);
    const [staffRows] = await pool.query("SELECT COUNT(*) AS cnt FROM users WHERE role = 'staff'");
    console.log(`  ✅  Reset: ${staffRows[0].cnt} staff member(s) → student count = 0`);

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');

    // ── 6. Summary ────────────────────────────────────────────────
    const [adminRows] = await pool.query("SELECT name, email FROM users WHERE role = 'admin'");
    const [staffList] = await pool.query("SELECT name, email FROM users WHERE role = 'staff'");

    console.log(`\n${line}`);
    console.log('  ✅  Reset Complete! Remaining accounts:\n');
    console.log('  👑  Admin:');
    adminRows.forEach(a => console.log(`      ${a.name} — ${a.email}`));
    console.log(`\n  👨‍🏫  Staff (${staffList.length}):`);
    staffList.forEach(s => console.log(`      ${s.name} — ${s.email}`));
    console.log(`\n  📋  Students can now sign up fresh using their roll numbers.`);
    console.log(line + '\n');

    process.exit(0);
} catch (err) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('\n  ❌  Reset failed:', err.message);
    process.exit(1);
}
