import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('--- STARTING END-TO-END API TEST ---');
    let studentToken = '';
    let studentId = '';
    let staffToken = '';
    let staffId = 'ab19aa16-a047-4560-9ca7-85ef16769988'; // Dr. Priya R
    let adminToken = '';
    let reqId = '';
    let projId = '';

    try {
        // 1. Check Student Verification
        console.log('Step 1: Student Verification...');
        const verifyRes = await axios.post(`${API_URL}/auth/verify-student`, { rollNo: '26MCA0006', phone: '7708721878' });
        console.log('Verification Success:', verifyRes.data);

        // 2. Register Student
        console.log('\nStep 2: Student Registration...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            rollNo: '26MCA0006',
            phone: '7708721878',
            email: 'meena.t@college.edu',
            name: 'Meena T',
            password: 'student@123'
        });
        studentToken = regRes.data.token;
        studentId = regRes.data.id;
        console.log(`Registration Success - Token Received for ${regRes.data.name}`);

        // 3. Request Guide
        console.log('\nStep 3: Student requesting Guide (Dr. Priya R)...');
        const reqRes = await axios.post(`${API_URL}/guide-requests`, { staffId: staffId }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        reqId = reqRes.data._id;
        console.log(`Guide Request Submitted - ID: ${reqId}`);

        // 4. Staff Login
        console.log('\nStep 4: Staff Login...');
        const staffLogin = await axios.post(`${API_URL}/auth/login`, { email: 'priya@college.edu', password: 'Staff@1234' });
        staffToken = staffLogin.data.token;
        console.log(`Staff logged in. Current Capacity: ${staffLogin.data.currentStudentCount} / ${staffLogin.data.maxStudents}`);

        // 5. Staff Accepts Request
        console.log('\nStep 5: Staff accepting Guide Request...');
        const acceptRes = await axios.put(`${API_URL}/guide-requests/${reqId}/accept`, {}, {
            headers: { Authorization: `Bearer ${staffToken}` }
        });
        console.log(`Request Accepted - Status: ${acceptRes.data.request.status}`);

        // 6. Student Submits Project
        console.log('\nStep 6: Student submitting Project Proposal...');
        const projRes = await axios.post(`${API_URL}/projects`, {
            studentId: studentId,
            studentName: 'Meena T',
            guideId: staffId,
            guideName: 'Dr. Priya R',
            title: 'Advanced Analytics and Visualization for Network Traffic',
            domain: 'Application Software Development',
            techStack: 'Python, React, Node.js',
            abstract: 'This project monitors and visualizes heavy network loads dynamically.'
        }, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        projId = projRes.data._id;
        console.log(`Project Submitted - Ticket: ${projRes.data.ticketId}, Status: ${projRes.data.status}`);

        // 7. Staff Approves Title
        console.log('\nStep 7: Staff Approves Project Title...');
        const approveTitle = await axios.put(`${API_URL}/projects/${projId}/status`, {
            status: 'TITLE_APPROVED',
            comment: 'Title looks good.',
            actorName: 'Dr. Priya R',
            actorRole: 'staff',
            actorId: staffId
        }, { headers: { Authorization: `Bearer ${staffToken}` } });
        console.log(`Title Approved - Status: ${approveTitle.data.status}`);

        // 8. Admin Login & CSC Review
        console.log('\nStep 8: Admin Login & CSC Review...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, { email: 'admin@college.edu', password: 'Admin@1234' });
        adminToken = adminLogin.data.token;
        const cscReview = await axios.put(`${API_URL}/projects/${projId}/csc-review`, {
            cscStatus: 'CSC_APPROVED',
            comment: 'Scope looks solid. Approved for first review.'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log(`CSC Reviewed - Status: ${cscReview.data.status}`);

        // 9. Staff First Review
        console.log('\nStep 9: Staff submitting First Review Marks...');
        const fRev = await axios.put(`${API_URL}/projects/${projId}/first-review`, {
            actorName: 'Dr. Priya R',
            actorId: staffId,
            marks: { problemDefinition: 8, literatureReview: 10, novelIdea: 4, detailedDesign: 8, methodology: 25, guideMarks: 25 }
        }, { headers: { Authorization: `Bearer ${staffToken}` } });
        console.log(`First Review Done - Score out of 20: ${fRev.data.firstReview.normalizedOutOf20}`);

        // 10. Staff Second Review
        console.log('\nStep 10: Staff submitting Second Review Marks...');
        const sRev = await axios.put(`${API_URL}/projects/${projId}/second-review`, {
            actorName: 'Dr. Priya R',
            actorId: staffId,
            marks: { systemDesign: 8, modulesCompleted: 25, dataSet: 12, pseudoCode: 4, contribution: 8, guideMarks: 25 }
        }, { headers: { Authorization: `Bearer ${staffToken}` } });
        console.log(`Second Review Done - Score out of 20: ${sRev.data.secondReview.normalizedOutOf20}`);

        // 11. Student Submit Final Report (Trigger status)
        console.log('\nStep 11: Student marking project submitted...');
        const subProj = await axios.put(`${API_URL}/projects/${projId}/status`, {
            status: 'PROJECT_SUBMITTED',
            comment: 'Uploaded all files.',
            actorName: 'Meena T',
            actorRole: 'student',
            actorId: studentId
        }, { headers: { Authorization: `Bearer ${studentToken}` } });
        console.log(`Final Report Submitted - Status: ${subProj.data.status}`);

        // 12. Staff Verifies Documents & Marks Complete
        console.log('\nStep 12: Staff verifying docs & marking complete...');
        await axios.put(`${API_URL}/projects/${projId}/status`, { status: 'DOCUMENTS_VERIFIED', actorName: 'Dr. Priya R', actorRole: 'staff', actorId: staffId }, { headers: { Authorization: `Bearer ${staffToken}` } });
        const compProj = await axios.put(`${API_URL}/projects/${projId}/status`, { status: 'PROJECT_COMPLETED', actorName: 'Dr. Priya R', actorRole: 'staff', actorId: staffId }, { headers: { Authorization: `Bearer ${staffToken}` } });
        console.log(`Project Completed! Final Status: ${compProj.data.status}`);

        console.log('\n--- ALL E2E TESTS PASSED SUCCESSFULLY! ---');
    } catch (error) {
        console.error('\n--- TEST FAILED ---');
        console.error(error.response ? (error.response.data.message || error.response.data) : error.message);
    }
}

runTests();
