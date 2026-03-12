import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

async function resetJsonDatabase() {
    try {
        console.log('Reading db.json...');
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

        console.log('1. Removing student accounts...');
        data.users = data.users.filter(user => user.role !== 'student');

        console.log('2. Resetting staff capacities...');
        data.users.forEach(user => {
            if (user.role === 'staff') {
                user.currentStudentCount = 0;
            }
        });

        console.log('3. Emptying projects history...');
        data.projects = [];

        console.log('4. Resetting student registrations...');
        if (data.studentRegistry) {
            data.studentRegistry.forEach(student => {
                student.registered = false;
                student.assignedGuideId = null;
                student.assignedGuideName = "";
                delete student.userId;
            });
        }

        console.log('5. Emptying guide requests...');
        if (data.guideRequests) {
            data.guideRequests = [];
        }

        console.log('Writing changes to db.json...');
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

        console.log('\n--- VERIFICATION ---');
        console.log(`Remaining Staff/Admin Accounts: ${data.users.length}`);
        console.log(`Remaining Project Submissions: ${data.projects.length}`);
        console.log(`Remaining Guide Requests: ${data.guideRequests ? data.guideRequests.length : 0}`);
        console.log('\nJSON HARD RESET SUCCESSFUL! The system is now a clean slate.');

    } catch (err) {
        console.error('Error during hard reset:', err);
    }
}

resetJsonDatabase();
