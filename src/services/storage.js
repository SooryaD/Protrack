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

    submitProposal: async (studentId, studentName, proposalData) => {
        try {
            const { data } = await API.post('/projects', { ...proposalData, studentId, studentName });
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
