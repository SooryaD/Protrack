import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import connectDB from './db.js';

await connectDB();

const hashPw = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

async function seedDemo() {
    try {
        console.log('Connecting to database and clearing existing tables...');
        
        // ── Clear existing data ────────────────────────────────────────
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');
        await pool.query('TRUNCATE TABLE project_files');
        await pool.query('TRUNCATE TABLE projects');
        await pool.query('TRUNCATE TABLE guide_requests');
        await pool.query('TRUNCATE TABLE student_registry');
        await pool.query('TRUNCATE TABLE users');
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🗑️  Cleared all tables successfully.');

        // ── 1. Admin ───────────────────────────────────────────────────
        const adminPw = await hashPw('Admin@1234');
        await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            ['System Admin', 'admin@college.edu', adminPw, 'admin']
        );
        console.log('✅ Admin created: admin@college.edu / Admin@1234');

        // ── 2. Staff (2) ──────────────────────────────────────────────
        const staffList = [
            { name: 'Dr. Anand K', email: 'staff1@college.edu' },
            { name: 'Dr. Priya R', email: 'staff2@college.edu' }
        ];

        const staffIds = {};
        for (const s of staffList) {
            const pw = await hashPw('Staff@1234');
            const [res] = await pool.query(
                'INSERT INTO users (name, email, password, role, max_students, current_student_count) VALUES (?, ?, ?, ?, ?, ?)',
                [s.name, s.email, pw, 'staff', 3, 0]
            );
            staffIds[s.name] = res.insertId;
        }
        console.log('✅ 2 Staff accounts created.');

        // ── 3. Student Registry & Student Users (5) ────────────────────
        const TEST_PHONE = '7708721878';
        const students = [
            { rollNo: '26MCA0001', name: 'Ravi Kumar', email: 'student1@college.edu' },
            { rollNo: '26MCA0002', name: 'Priya Devi', email: 'student2@college.edu' },
            { rollNo: '26MCA0003', name: 'Sakthi Vel', email: 'student3@college.edu' },
            { rollNo: '26MCA0004', name: 'Divya S',     email: 'student4@college.edu' },
            { rollNo: '26MCA0005', name: 'Arjun M',     email: 'student5@college.edu' }
        ];

        for (const s of students) {
            // First create the user account so they can log in directly
            const pw = await hashPw('Student@1234');
            const [insertUser] = await pool.query(
                'INSERT INTO users (name, email, password, role, roll_no) VALUES (?, ?, ?, ?, ?)',
                [s.name, s.email, pw, 'student', s.rollNo]
            );
            const userId = insertUser.insertId;

            // Create the corresponding entry in student_registry marked as registered
            await pool.query(
                'INSERT INTO student_registry (roll_no, name, phone, registered, user_id) VALUES (?, ?, ?, ?, ?)',
                [s.rollNo, s.name, TEST_PHONE, true, userId]
            );
        }
        console.log('✅ 5 Pre-registered Student logins created.');

        console.log('\n🎉 DEMO SEED COMPLETE!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Demo Seeder error:', err.message);
        process.exit(1);
    }
}

seedDemo();
