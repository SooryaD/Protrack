/**
 * seed_real_staff.js
 * ──────────────────────────────────────────────────────────────
 * Replaces existing dummy staff with real department staff.
 * Keeps Admin accounts untouched.
 * Default password for all staff: Staff@1234
 * ──────────────────────────────────────────────────────────────
 */

import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import connectDB from './db.js';

await connectDB();

const hashPw = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

const REAL_STAFF = [
    { name: 'Dr. R. Bhuvaneswaran',    email: 'bhuvaneswaran@college.edu',   designation: 'Professor & Director' },
    { name: 'Dr. D. Sridharan',        email: 'sridharan@college.edu',       designation: 'Professor' },
    { name: 'Dr. P. Sakthivel',        email: 'sakthivel@college.edu',       designation: 'Professor' },
    { name: 'Dr. S. Bose',             email: 'bose@college.edu',            designation: 'Professor' },
    { name: 'Dr. R. Baskaran',         email: 'baskaran@college.edu',        designation: 'Professor' },
    { name: 'Dr. K. Gunaseelan',       email: 'gunaseelan@college.edu',      designation: 'Professor' },
    { name: 'Dr. Arockia Xaiver Annie',email: 'arockia.annie@college.edu',   designation: 'Associate Professor' },
    { name: 'Dr. P. Geetha',           email: 'geetha@college.edu',          designation: 'Associate Professor' },
    { name: 'Dr. K. Vidya',            email: 'vidya@college.edu',           designation: 'Associate Professor' },
    { name: 'Dr. N. Saraswathi',       email: 'saraswathi@college.edu',      designation: 'Assistant Professor (Sr. G)' },
    { name: 'Dr. S. Lokesh',           email: 'lokesh@college.edu',          designation: 'Associate Professor' },
    { name: 'Dr. P. Velvizhy',         email: 'velvizhy@college.edu',        designation: 'Assistant Professor' },
    { name: 'Dr. S. Abirami',          email: 'abirami@college.edu',         designation: 'Professor' },
    { name: 'Dr. Selvi Ravindran',     email: 'selvi.ravindran@college.edu', designation: 'Associate Professor' },
    { name: 'Dr. M. Vijayalakshmi',   email: 'vijayalakshmi@college.edu',   designation: 'Professor' },
];

const line = '─'.repeat(60);

console.log(`\n${line}`);
console.log('  👨‍🏫  ProTrack — Real Staff Seeder');
console.log(line);

try {
    // Step 0: Add designation column if it doesn't exist
    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS designation VARCHAR(100) DEFAULT NULL
    `).catch(() => {}); // Ignore if already exists
    console.log('  ✅  Column `designation` ready.');

    // Step 1: Remove existing dummy/old staff accounts
    const [delResult] = await pool.query("DELETE FROM users WHERE role = 'staff'");
    console.log(`  🗑️   Removed ${delResult.affectedRows} old staff account(s).`);

    // Step 2: Insert real staff
    const password = await hashPw('Staff@1234');

    for (const s of REAL_STAFF) {
        await pool.query(
            `INSERT INTO users (name, email, password, role, designation, max_students, current_student_count)
             VALUES (?, ?, ?, 'staff', ?, 5, 0)`,
            [s.name, s.email, password, s.designation]
        );
        console.log(`  ✅  Created: ${s.name.padEnd(30)} → ${s.email}`);
    }

    console.log(`\n${line}`);
    console.log(`  🎉  ${REAL_STAFF.length} staff accounts created!`);
    console.log(`\n  🔑  Login password for all staff: Staff@1234`);
    console.log(`\n  Staff email format: <lastname>@college.edu`);
    console.log(`\n  Example logins:`);
    console.log(`      bhuvaneswaran@college.edu  /  Staff@1234`);
    console.log(`      sridharan@college.edu      /  Staff@1234`);
    console.log(`      sakthivel@college.edu      /  Staff@1234`);
    console.log(line + '\n');

    process.exit(0);
} catch (err) {
    console.error('\n  ❌  Error:', err.message);
    process.exit(1);
}
