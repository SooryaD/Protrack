
import JsonModel from './models/JsonModel.js';

const verifyDb = async () => {
    const db = await JsonModel.readDb();
    const students = db.users?.filter(u => u.role === 'student') || [];
    const staffWithStudents = db.users?.filter(u => u.role === 'staff' && u.currentStudentCount > 0) || [];
    
    console.log(`Projects count: ${db.projects?.length || 0}`);
    console.log(`Guide Requests count: ${db.guideRequests?.length || 0}`);
    console.log(`Student accounts count: ${students.length}`);
    console.log(`Staff with >0 students: ${staffWithStudents.length}`);
};

verifyDb();
