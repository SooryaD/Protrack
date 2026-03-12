import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import Project from './models/Project.js';
import User from './models/User.js';

let MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_project_tracker';

// Force IPv4 for local connection to prevent timeouts
if (MONGODB_URI.includes('localhost')) {
    MONGODB_URI = MONGODB_URI.replace('localhost', '127.0.0.1');
}

async function hardReset() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        console.log('1. Deleting all Projects...');
        const projectResult = await Project.deleteMany({});
        console.log(`- Deleted ${projectResult.deletedCount} projects.`);

        console.log('2. Deleting all Student Accounts...');
        const studentResult = await User.deleteMany({ role: 'student' });
        console.log(`- Deleted ${studentResult.deletedCount} student accounts.`);

        console.log('3. Resetting Staff Allocations...');
        const staffResult = await User.updateMany(
            { role: 'staff' },
            { 
                $set: { currentStudentCount: 0 },
                $unset: { assignedStudents: "" }
            }
        );
        console.log(`- Reset capacities for ${staffResult.modifiedCount} staff members.`);

        // Verification
        const remainingProjects = await Project.countDocuments();
        const remainingStudents = await User.countDocuments({ role: 'student' });

        console.log('\n--- VERIFICATION ---');
        console.log(`Total Projects remaining: ${remainingProjects}`);
        console.log(`Total Students remaining: ${remainingStudents}`);
        
        if (remainingProjects === 0 && remainingStudents === 0) {
            console.log('\nHARD RESET SUCCESSFUL! The system is now a clean slate.');
        } else {
            console.warn('\nWARNING: Some data may still exist.');
        }

    } catch (err) {
        console.error('Error during hard reset:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected.');
    }
}

hardReset();
