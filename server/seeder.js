import dotenv from 'dotenv';
import User from './models/User.js';
import StudentRegistry from './models/StudentRegistry.js';
import connectDB from './db.js';

dotenv.config();
connectDB();

const importData = async () => {
    try {
        // ── Clear existing data ──────────────────────────────────────
        await User.deleteMany();
        await StudentRegistry.deleteMany();

        // ── 1. Admin ─────────────────────────────────────────────────
        await User.create({
            name: 'System Admin',
            email: 'admin@college.edu',
            password: 'Admin@1234',
            role: 'admin',
            isActive: true,
        });

        // ── 2. Staff (10) ─────────────────────────────────────────────
        const staffList = [
            { name: 'Dr. Anand K', email: 'anand@college.edu' },
            { name: 'Dr. Priya R', email: 'priya@college.edu' },
            { name: 'Dr. Karthik V', email: 'karthik@college.edu' },
            { name: 'Dr. Sunita N', email: 'sunita@college.edu' },
            { name: 'Dr. Ramesh S', email: 'ramesh@college.edu' },
            { name: 'Dr. Deepa M', email: 'deepa@college.edu' },
            { name: 'Dr. Senthil P', email: 'senthil@college.edu' },
            { name: 'Dr. Kaveri J', email: 'kaveri@college.edu' },
            { name: 'Dr. Manikam T', email: 'manikam@college.edu' },
            { name: 'Dr. Rekha B', email: 'rekha@college.edu' },
        ];

        const createdStaff = [];
        for (const s of staffList) {
            const staff = await User.create({
                ...s,
                password: 'Staff@1234',
                role: 'staff',
                isActive: true,
                maxStudents: 2,
                currentStudentCount: 0
            });
            createdStaff.push(staff);
        }

        // ── 3. Student Registry (20) — Roll No + Phone pre-seeded ────
        // Students will self-register using rollNo + phone number
        // Phone for all: 7708721878 (testing)
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
            await StudentRegistry.create({
                rollNo: s.rollNo,
                name: s.name,
                phone: TEST_PHONE,
                assignedGuideId: null,
                assignedGuideName: '',
                registered: false,
            });
        }

        console.log('✅ Seed complete!');
        console.log('   Admin:  admin@college.edu  /  Admin@1234');
        console.log('   Staff:  e.g. anand@college.edu  /  Staff@1234  (10 staff total)');
        console.log('   Students: 20 registry entries seeded (Roll: 26MCA0001–26MCA0020, Phone: 7708721878)');
        console.log('   Students self-register at /signup using Roll No + Phone');
        process.exit();
    } catch (error) {
        console.error('Seeder error:', error);
        process.exit(1);
    }
};

importData();
