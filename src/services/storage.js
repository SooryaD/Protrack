import API from './api';

// Helper to normalize _id to id
const normalize = (data) => {
    if (Array.isArray(data)) return data.map(item => ({ ...item, id: item._id || item.id }));
    if (data && typeof data === 'object') return { ...data, id: data._id || data.id };
    return data;
};

export const ProjectService = {
    // --- User Management (Admin) ---
    getAllUsers: async () => {
        try { const { data } = await API.get('/users'); return normalize(data); }
        catch (error) { return []; }
    },

    getStaffUsers: async () => {
        try { const { data } = await API.get('/users/staff'); return normalize(data); }
        catch (error) { return []; }
    },

    authenticate: async (credentials, password) => {
        try {
            const { data } = await API.post('/auth/login', { ...credentials, password });
            return { success: true, user: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Authentication failed' };
        }
    },

    addUser: async (user) => {
        try { const { data } = await API.post('/users', user); return { success: true, user: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to create user' }; }
    },

    // Verify student roll no + phone before signup
    verifyStudent: async (rollNo, phone) => {
        try {
            const { data } = await API.post('/auth/verify-student', { rollNo, phone });
            return { success: true, ...data };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Verification failed' };
        }
    },

    // Register a new student account after verification
    registerStudent: async (rollNo, phone, email, password, name) => {
        try {
            const { data } = await API.post('/auth/register', { rollNo, phone, email, password, name });
            return { success: true, user: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Registration failed' };
        }
    },

    // --- Guide Requests ---
    sendGuideRequest: async (staffId) => {
        try { const { data } = await API.post('/guide-requests', { staffId }); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to send request' }; }
    },
    getMyGuideRequest: async () => {
        try { const { data } = await API.get('/guide-requests/mine'); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to fetch request' }; }
    },
    getIncomingRequests: async () => {
        try { const { data } = await API.get('/guide-requests/incoming'); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to fetch incoming requests' }; }
    },
    acceptGuideRequest: async (requestId) => {
        try { const { data } = await API.put(`/guide-requests/${requestId}/accept`); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to accept request' }; }
    },
    rejectGuideRequest: async (requestId, reason) => {
        try { const { data } = await API.put(`/guide-requests/${requestId}/reject`, { reason }); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to reject request' }; }
    },
    setStaffCapacity: async (staffId, maxStudents) => {
        try { const { data } = await API.put(`/users/${staffId}/capacity`, { maxStudents }); return { success: true, data: normalize(data) }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Failed to update capacity' }; }
    },

    deleteUser: async (userId) => {
        try { await API.delete(`/users/${userId}`); return { success: true }; }
        catch (error) { return { success: false, error: error.response?.data?.message || 'Delete failed' }; }
    },

    // --- Project / Proposal Management ---
    getStudentProposals: async (studentId) => {
        try {
            const { data } = await API.get('/projects');
            return normalize(data).filter(p => p.studentId === studentId);
        } catch (error) { return []; }
    },

    submitProposal: async (studentId, studentName, proposalData, abstractFile) => {
        try {
            const formData = new FormData();
            formData.append('studentId', studentId);
            formData.append('studentName', studentName);
            for (const key in proposalData) {
                if (proposalData[key]) formData.append(key, proposalData[key]);
            }
            if (abstractFile) {
                formData.append('abstractFile', abstractFile);
            }
            const { data } = await API.post('/projects', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Submission failed' };
        }
    },

    getAllProposals: async () => {
        try { const { data } = await API.get('/projects'); return normalize(data); }
        catch (error) { return []; }
    },

    updateStatus: async (proposalId, status, comment, actorName, actorRole, actorId) => {
        try {
            const { data } = await API.put(`/projects/${proposalId}/status`, { status, comment, actorName, actorRole, actorId });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Update failed' };
        }
    },

    // CSC Review (Admin)
    cscReview: async (projectId, cscStatus, comment, actorName) => {
        try {
            const { data } = await API.put(`/projects/${projectId}/csc-review`, { cscStatus, comment, actorName });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'CSC review failed' };
        }
    },

    // First Review marks (Guide)
    submitFirstReview: async (projectId, marks, actorName, actorId) => {
        try {
            const { data } = await API.put(`/projects/${projectId}/first-review`, { marks, actorName, actorId });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'First review submission failed' };
        }
    },

    // Second Review marks (Guide)
    submitSecondReview: async (projectId, marks, actorName, actorId) => {
        try {
            const { data } = await API.put(`/projects/${projectId}/second-review`, { marks, actorName, actorId });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Second review submission failed' };
        }
    },

    // Viva Score marks (Guide)
    submitVivaScore: async (projectId, marks, actorName, actorId) => {
        try {
            const { data } = await API.put(`/projects/${projectId}/viva-score`, { marks, actorName, actorId });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Viva score submission failed' };
        }
    },

    getStats: async () => {
        try {
            const { data } = await API.get('/projects');
            const total = data.length;
            const completed = data.filter(p => p.status === 'PROJECT_COMPLETED').length;
            const rejected = data.filter(p => ['TITLE_REJECTED', 'CSC_NOT_APPROVED'].includes(p.status)).length;
            const inReview = data.filter(p => ['FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'].includes(p.status)).length;
            const pending = total - completed - rejected;
            return { total, completed, pending, rejected, inReview };
        } catch (error) { return { total: 0, completed: 0, pending: 0, rejected: 0, inReview: 0 }; }
    },

    uploadFile: async (projectId, type, file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            const { data } = await API.post(`/projects/${projectId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            return { success: true, data: normalize(data) };
        } catch (error) {
            return { success: false, error: error.response?.data?.message || 'Upload failed' };
        }
    }
};
