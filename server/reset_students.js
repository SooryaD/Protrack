import dotenv from 'dotenv';
import JsonModel from './models/JsonModel.js';
import connectDB from './db.js';

dotenv.config();
connectDB();

const resetStudents = async () => {
    try {
        const db = await JsonModel.readDb();

        // 1. Clear projects and guide requests completely
        db.projects = [];
        db.guideRequests = [];

        // 2. Remove all students from the users collection
        if (db.users) {
            db.users = db.users.filter(user => user.role !== 'student');

            // 3. Reset Staff allocation counts
            db.users = db.users.map(user => {
                if (user.role === 'staff') {
                    return {
                        ...user,
                        currentStudentCount: 0,
                        studentsAssigned: []
                    };
                }
                return user;
            });
        }

        // 4. Reset Student Registry
        if (db.studentRegistry) {
            db.studentRegistry = db.studentRegistry.map(student => ({
                ...student,
                assignedGuideId: null,
                assignedGuideName: '',
                registered: false
            }));
        }

        await JsonModel.writeDb(db);

        console.log('✅ Student and Project data reset successfully.');
        console.log('   - All projects and guide requests cleared.');
        console.log('   - All student accounts deleted.');
        console.log('   - Student registry reset (registered: false, assigned guides cleared).');
        console.log('   - Staff student allocation counts reset to 0.');
        
        process.exit();
    } catch (error) {
        console.error('Reset error:', error);
        process.exit(1);
    }
};

resetStudents();
