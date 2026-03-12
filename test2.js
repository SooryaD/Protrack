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

async function runTest() {
    try {
        console.log("--- STARTING WORKFLOW TEST ---");

        // 1. Logins
        const adminLogin = await login('admin@college.edu', 'Admin@1234');
        const staffLogin = await login('manikam@college.edu', 'Staff@1234');
        
        const randomRoll = 'RO' + Math.floor(Math.random() * 100000);
        const randomEmail = `kiran.${randomRoll}@college.edu`;
        await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rollNo: randomRoll, name: 'Kiran C Test', email: randomEmail, password: 'student@123', phone: '1234567890' })
        });
        const studentLogin = await login(randomEmail, 'student@123');

        console.log("Tokens:", !!adminLogin.token, !!staffLogin.token, !!studentLogin.token);

        const adminToken = adminLogin.token;
        const staffToken = staffLogin.token;
        const studentToken = studentLogin.token;
        
        const staffId = staffLogin._id;
        const studentId = studentLogin._id;

        console.log("Logged in successfully. Student:", studentLogin.name, "Staff:", staffLogin.name);

        // Fetch existing project to resume or delete
        const projRes = await fetch(`${BASE_URL}/projects`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const allProj = await projRes.json();
        let project = allProj.find(p => p.studentId === studentId);
        
        if (!project) {
            console.log("Creating new project...");
            // Create a multipart form payload manually since FormData from external package is annoying
            // Actually, just sending a JSON POST to `/api/projects` might fail due to multer expecting multipart.
            // I'll dynamically import `form-data` just for this.
            const FormData = (await import('form-data')).default;
            let formData = new FormData();
            formData.append('studentId', studentId);
            formData.append('studentName', studentLogin.name);
            formData.append('guideId', staffId);
            formData.append('guideName', staffLogin.name);
            formData.append('title', 'Automated Healthcare Diagnostic System using Deep Learning Architecture');
            formData.append('domain', 'Application Software Development');
            formData.append('techStack', 'Python, TensorFlow');
            formData.append('abstract', 'Using deep learning to diagnose things.');
            
            fs.writeFileSync('dummy_abstract.pdf', 'Dummy abstract content');
            formData.append('abstractFile', fs.createReadStream('dummy_abstract.pdf'));

            const submitRes = await fetch(`${BASE_URL}/projects`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${studentToken}` },
                body: formData
            });
            project = await submitRes.json();
            if(!project._id) throw new Error("Failed to create project: " + JSON.stringify(project));
            console.log("Student submitted project:", project.ticketId, project.status); 
        } else {
            console.log("Using existing project:", project.ticketId, project.status);
        }

        const runStatus = async (status, token, extra = {}) => {
            const res = await fetch(`${BASE_URL}/projects/${project._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status, ...extra })
            });
            return await res.json();
        }

        // 3. Staff Approves Title
        if(project.status === 'TITLE_PENDING') {
            project = await runStatus('TITLE_APPROVED', staffToken, { comment: 'Looks good', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId });
            console.log("Staff approved title:", project.status); 
        }

        // 4. Admin CSC Review
        if(project.status === 'TITLE_APPROVED') {
            const res = await fetch(`${BASE_URL}/projects/${project._id}/csc-review`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify({ cscStatus: 'CSC_APPROVED', comment: 'Approved by CSC', actorName: 'Admin' })
            });
            project = await res.json();
            console.log("Admin approved CSC:", project.status);
        }

        // 5. Staff First Review
        if(project.status === 'FIRST_REVIEW_PENDING') {
            const firstReviewMarks = { problemDefinition: 5, literatureReview: 5, novelIdea: 5, detailedDesign: 5, methodology: 5, guideMarks: 5 };
            const res = await fetch(`${BASE_URL}/projects/${project._id}/first-review`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
                body: JSON.stringify({ marks: firstReviewMarks, actorName: staffLogin.name, actorId: staffId })
            });
            project = await res.json();
            console.log("Staff submitted First Review:", project.status);
        }

        if(project.status === 'FIRST_REVIEW_DONE') {
            const secondReviewMarks = { systemDesign: 5, modulesCompleted: 5, dataSet: 5, pseudoCode: 5, contribution: 5, guideMarks: 5 };
            const res = await fetch(`${BASE_URL}/projects/${project._id}/second-review`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
                body: JSON.stringify({ marks: secondReviewMarks, actorName: staffLogin.name, actorId: staffId })
            });
            project = await res.json();
            console.log("Staff submitted Second Review:", project.status);
        }

        // 7. Student Uploads Final Document
        if(project.status === 'SECOND_REVIEW_DONE') {
            project = await runStatus('PROJECT_SUBMITTED', studentToken, { comment: 'Final submission', actorName: studentLogin.name, actorRole: 'student', actorId: studentId });
            console.log("Student submitted final report:", project.status);
        }

        if(project.status === 'PROJECT_SUBMITTED') {
            project = await runStatus('DOCUMENTS_VERIFIED', staffToken, { comment: 'Docs look OK', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId });
            console.log("Staff verified documents:", project.status);
        }

        if(project.status === 'DOCUMENTS_VERIFIED') {
            const vivaScore = { marks: 18, comment: 'Good presentation' };
            const res = await fetch(`${BASE_URL}/projects/${project._id}/viva-score`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
                body: JSON.stringify({ marks: 18, actorName: staffLogin.name, actorId: staffId })
            });
            project = await res.json();
            console.log("Staff submitted Viva Score, status:", project.status);

            project = await runStatus('PENDING_ADMIN_APPROVAL', staffToken, { comment: 'Ready for final', actorName: staffLogin.name, actorRole: 'staff', actorId: staffId });
            console.log("Staff requested Admin Verification:", project.status);
        }

        if(project.status === 'PENDING_ADMIN_APPROVAL') {
            project = await runStatus('PROJECT_COMPLETED', adminToken, { comment: 'Approved finalizing', actorName: 'Admin', actorRole: 'admin' });
            console.log("Admin Completed project:", project.status);
            console.log("Response msg:", project.message || "Success!");
            console.log("Final Project State:", JSON.stringify(project, null, 2));
        }

    } catch (e) {
        console.error("Test Error:", e);
    }
}

runTest();
