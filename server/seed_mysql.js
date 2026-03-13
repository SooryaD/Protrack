import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import connectDB from './db.js';

await connectDB();

const hashPw = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

try {
    // ── Clear existing data ────────────────────────────────────────
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE project_files');
    await pool.query('TRUNCATE TABLE projects');
    await pool.query('TRUNCATE TABLE guide_requests');
    await pool.query('TRUNCATE TABLE student_registry');
    await pool.query('TRUNCATE TABLE users');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️  Cleared all tables.');

    // ── 1. Admin ───────────────────────────────────────────────────
    await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['System Admin', 'admin@college.edu', await hashPw('Admin@1234'), 'admin']
    );
    console.log('✅ Admin created.');

    // ── 2. Staff (10) ──────────────────────────────────────────────
    const staffList = [
        { name: 'Dr. Anand K',    email: 'anand@college.edu' },
        { name: 'Dr. Priya R',    email: 'priya@college.edu' },
        { name: 'Dr. Karthik V',  email: 'karthik@college.edu' },
        { name: 'Dr. Sunita N',   email: 'sunita@college.edu' },
        { name: 'Dr. Ramesh S',   email: 'ramesh@college.edu' },
        { name: 'Dr. Deepa M',    email: 'deepa@college.edu' },
        { name: 'Dr. Senthil P',  email: 'senthil@college.edu' },
        { name: 'Dr. Kaveri J',   email: 'kaveri@college.edu' },
        { name: 'Dr. Manikam T',  email: 'manikam@college.edu' },
        { name: 'Dr. Rekha B',    email: 'rekha@college.edu' },
    ];

    for (const s of staffList) {
        await pool.query(
            'INSERT INTO users (name, email, password, role, max_students, current_student_count) VALUES (?, ?, ?, ?, ?, ?)',
            [s.name, s.email, await hashPw('Staff@1234'), 'staff', 2, 0]
        );
    }
    console.log('✅ 10 Staff accounts created.');

    // ── 3. Student Registry ────────────────────────────────────────
    const TEST_PHONE = '7708721878';
    const studentRegistry = [
        { rollNo: '26MCA0001', name: 'Ravi Kumar' },
        { rollNo: '26MCA0002', name: 'Priya Devi' },
        { rollNo: '26MCA0003', name: 'Sakthi Vel' },
        { rollNo: '26MCA0004', name: 'Divya S' },
        { rollNo: '26MCA0005', name: 'Arjun M' },
        { rollNo: '26MCA0006', name: 'Meena T' },
        { rollNo: '26MCA0007', name: 'Vikram G' },
        { rollNo: '26MCA0008', name: 'Kavitha R' },
        { rollNo: '26MCA0009', name: 'Rohit P' },
        { rollNo: '26MCA0010', name: 'Nithya J' },
        { rollNo: '26MCA0011', name: 'Arun B' },
        { rollNo: '26MCA0012', name: 'Sudha L' },
        { rollNo: '26MCA0013', name: 'Kiran C' },
        { rollNo: '26MCA0014', name: 'Sangeetha V' },
        { rollNo: '26MCA0015', name: 'Manoj D' },
        { rollNo: '26MCA0016', name: 'Lavanya S' },
        { rollNo: '26MCA0017', name: 'Suresh N' },
        { rollNo: '26MCA0018', name: 'Anitha K' },
        { rollNo: '26MCA0019', name: 'Bala M' },
        { rollNo: '26MCA0020', name: 'Celsia R' },
    ];

    for (const s of studentRegistry) {
        await pool.query(
            'INSERT INTO student_registry (roll_no, name, phone, registered) VALUES (?, ?, ?, ?)',
            [s.rollNo, s.name, TEST_PHONE, false]
        );
    }
    console.log('✅ 20 Student registry entries created.');

    console.log('\n🎉 Seed complete!');
    console.log('   Admin :  admin@college.edu       /  Admin@1234');
    console.log('   Staff :  anand@college.edu  etc  /  Staff@1234');
    console.log('   Students self-register at /signup using Roll No + Phone (7708721878)');
    process.exit(0);
} catch (err) {
    console.error('❌ Seeder error:', err.message);
    process.exit(1);
}
