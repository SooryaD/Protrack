import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000/api';

async function login(email, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function registerNode(rollNo, name, email, password) {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, name, email, password, role: 'student' })
    });
    return await res.json();
}

async function runTest() {
    console.log("--- STARTING WORKFLOW TEST ---");

    // 1. Logins
    const adminLogin = await login('admin@college.edu', 'Admin@1234');
    const staffLogin = await login('manikam@college.edu', 'Staff@1234');
    const studentLogin = await login('kiran.c@college.edu', 'student@123');

    const adminToken = adminLogin.token;
    const staffToken = staffLogin.token;
    const studentToken = studentLogin.token;
    
    const staffId = staffLogin._id;
    const studentId = studentLogin._id;

    console.log("Logged in successfully. Student:", studentLogin.name, "Staff:", staffLogin.name);

    // 2. Student Proposal
    let formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('studentName', studentLogin.name);
    formData.append('guideId', staffId);
    formData.append('guideName', staffLogin.name);
    formData.append('title', 'Automated Healthcare Diagnostic System using Deep Learning');
    formData.append('domain', 'Application Software Development');
    formData.append('techStack', 'Python, TensorFlow');
    formData.append('abstract', 'Using deep learning to diagnose things.');
    
    // Create a dummy PDF for upload
    fs.writeFileSync('dummy_abstract.pdf', 'Dummy abstract content');
    formData.append('abstractFile', fs.createReadStream('dummy_abstract.pdf'));

    const submitRes = await fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: formData
    });
    let project = await submitRes.json();
    console.log("Student submitted project:", project.ticketId, project.status); 
    
    // 3. Staff Approves Title
    const titleApproveRes = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'TITLE_APPROVED', comment: 'Looks good', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId })
    });
    project = await titleApproveRes.json();
    console.log("Staff approved title:", project.status); 

    // 4. Admin CSC Review
    const cscRes = await fetch(`${BASE_URL}/projects/${project._id}/csc-review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ cscStatus: 'CSC_APPROVED', comment: 'Approved by CSC', actorName: 'Admin' })
    });
    project = await cscRes.json();
    console.log("Admin approved CSC:", project.status);

    // 5. Staff First Review
    const firstReviewMarks = { problemDefinition: 5, literatureReview: 5, novelIdea: 5, detailedDesign: 5, methodology: 5, guideMarks: 5 };
    const r1Res = await fetch(`${BASE_URL}/projects/${project._id}/first-review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ marks: firstReviewMarks, actorName: staffLogin.name, actorId: staffId })
    });
    project = await r1Res.json();
    console.log("Staff submitted First Review:", project.status); // Should be FIRST_REVIEW_DONE
    console.log("Is p.firstReview set?", !!project.firstReview);

    // 6. Staff Second Review
    const secondReviewMarks = { systemDesign: 5, modulesCompleted: 5, dataSet: 5, pseudoCode: 5, contribution: 5, guideMarks: 5 };
    const r2Res = await fetch(`${BASE_URL}/projects/${project._id}/second-review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ marks: secondReviewMarks, actorName: staffLogin.name, actorId: staffId })
    });
    project = await r2Res.json();
    console.log("Staff submitted Second Review:", project.status); // Should be SECOND_REVIEW_DONE
    console.log("Is p.secondReview set?", !!project.secondReview);

    // 7. Student Uploads Final Document
    fs.writeFileSync('dummy_report.pdf', 'Dummy report');
    let fdReport = new FormData();
    fdReport.append('type', 'report');
    fdReport.append('file', fs.createReadStream('dummy_report.pdf'));
    const reportRes = await fetch(`${BASE_URL}/projects/${project._id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: fdReport
    });
    await reportRes.json();
    
    fs.writeFileSync('dummy_code.zip', 'Dummy code zip');
    let fdCode = new FormData();
    fdCode.append('type', 'code');
    fdCode.append('file', fs.createReadStream('dummy_code.zip'));
    const codeRes = await fetch(`${BASE_URL}/projects/${project._id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${studentToken}` },
        body: fdCode
    });
    await codeRes.json();

    const submitFinalRes = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
        body: JSON.stringify({ status: 'PROJECT_SUBMITTED', comment: 'Final submission', actorName: studentLogin.name, actorRole: 'student', actorId: studentId })
    });
    project = await submitFinalRes.json();
    console.log("Student submitted final report:", project.status); // Should be PROJECT_SUBMITTED

    // 8. Staff Verifies Docs
    const docVerifyRes = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'DOCUMENTS_VERIFIED', comment: 'Docs look OK', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId })
    });
    project = await docVerifyRes.json();
    console.log("Staff verified documents:", project.status);

    // 9. Staff Submits Viva Marks & Requests Admin Approval
    const vivaScore = { marks: 18, comment: 'Good presentation' };
    const vivaRes = await fetch(`${BASE_URL}/projects/${project._id}/viva-score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ vivaScore, actorName: staffLogin.name, actorId: staffId })
    });
    project = await vivaRes.json();
    console.log("Staff submitted Viva Score, status:", project.status);

    const pendingAdminRes = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'PENDING_ADMIN_APPROVAL', comment: 'Ready for final verification', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId })
    });
    project = await pendingAdminRes.json();
    console.log("Staff requested Admin Verification:", project.status);

    // 10. Admin Finally Completes Project
    const completeRes = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'PROJECT_COMPLETED', comment: 'Approved finalizing', actorName: 'Admin', actorRole: 'admin' })
    });
    project = await completeRes.json();
    console.log("Admin Completed project:", project.status);
    console.log(project.message || "No error returned!");
}

runTest().catch(console.error);
