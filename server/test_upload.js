const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testUpload() {
    try {
        // 1. Login as Student
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            loginId: 'student1@edu',
            password: 'student1'
        });
        const token = loginRes.data.token;
        const studentId = loginRes.data._id;
        console.log('Logged in as:', loginRes.data.name);

        // 2. Get Project
        console.log('Fetching projects...');
        const projectsRes = await axios.get('http://localhost:5000/api/projects');
        const myProject = projectsRes.data.find(p => p.studentId === studentId);

        if (!myProject) {
            console.error('No project found for student1. Please create one first in the UI or via script.');
            // Create one if missing?
            // For now, let's assume one exists or fail.
            // Actually, let's create one if missing to be robust.
            console.log('Creating dummy project...');
            const createRes = await axios.post('http://localhost:5000/api/projects', {
                studentId: studentId,
                studentName: loginRes.data.name,
                guideId: "659d5b7e8d6a7f1a2b3c4e5f", // Fake ID or need real one?
                guideName: "Staff One",
                title: "Test Project for Upload",
                domain: "Testing",
                techStack: "NodeJS",
                abstract: "Testing file upload"
            }, { headers: { Authorization: `Bearer ${token}` } });
            console.log('Project created:', createRes.data.id || createRes.data._id);
            return await uploadToProject(createRes.data.id || createRes.data._id, token);
        }

        await uploadToProject(myProject.id || myProject._id, token);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

async function uploadToProject(projectId, token) {
    console.log(`Uploading file to project ${projectId}...`);

    // Create a dummy file
    const dummyPath = path.join(__dirname, 'test_upload_file.txt');
    fs.writeFileSync(dummyPath, 'This is a test file content.');

    const form = new FormData();
    form.append('file', fs.createReadStream(dummyPath));
    form.append('type', 'report'); // Testing report upload

    try {
        const res = await axios.post(`http://localhost:5000/api/projects/${projectId}/upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        console.log('Upload Success!', res.data);
    } catch (err) {
        console.error('Upload Failed:', err.response ? err.response.data : err.message);
    } finally {
        fs.unlinkSync(dummyPath);
    }
}

testUpload();
