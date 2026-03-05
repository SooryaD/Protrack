import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount, attempt to restore session from localStorage token
    useEffect(() => {
        const restoreSession = async () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                setLoading(false);
                return;
            }

            let stored;
            try {
                stored = JSON.parse(storedUser);
            } catch {
                localStorage.removeItem('user');
                setLoading(false);
                return;
            }

            if (!stored?.token) {
                localStorage.removeItem('user');
                setLoading(false);
                return;
            }

            try {
                // Use a direct axios call (bypasses our 401 interceptor) so a
                // bad/expired token doesn't trigger a hard redirect during restore.
                const { data } = await axios.get('http://localhost:5000/api/auth/me', {
                    headers: { Authorization: `Bearer ${stored.token}` },
                });

                // Normalise id field and merge token back in
                const restoredUser = { ...data, id: data.id || data._id, token: stored.token };
                setUser(restoredUser);
                // Keep localStorage in sync with fresh server data
                localStorage.setItem('user', JSON.stringify(restoredUser));
            } catch {
                // Token invalid or expired — clear session silently
                localStorage.removeItem('user');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    const login = async (credentials, password) => {
        // credentials = { rollNo } for students, { email } for staff/admin
        try {
            const { data } = await API.post('/auth/login', { ...credentials, password });
            const userData = { ...data, id: data._id || data.id };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return { success: true, user: userData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Authentication failed'
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
