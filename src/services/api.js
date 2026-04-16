import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Request interceptor — attach Bearer token from localStorage
API.interceptors.request.use((req) => {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const { token } = JSON.parse(user);
            if (token) {
                req.headers.Authorization = `Bearer ${token}`;
            }
        } catch {
            // Corrupted data in localStorage — ignore
        }
    }
    return req;
});

// Response interceptor — only log out on genuine token failures
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const msg = error.response?.data?.message?.toLowerCase() || '';
            const isTokenError = msg.includes('token') || msg.includes('not authorized') || msg.includes('no token');
            if (isTokenError) {
                localStorage.removeItem('user');
                if (window.location.pathname !== '/') {
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default API;
