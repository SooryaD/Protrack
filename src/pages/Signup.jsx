import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, Layout } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';

const Signup = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
    });
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        // Clear inline error when user types
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Full name is required.';
        if (!formData.email.trim()) newErrors.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Enter a valid email address.';
        if (!formData.password) newErrors.password = 'Password is required.';
        else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            const { data } = await API.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });

            // Auto-login
            const userData = { ...data, id: data._id || data.id };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));

            // Redirect to appropriate dashboard
            if (userData.role === 'staff') navigate('/staff-dashboard');
            else navigate('/student-dashboard');
        } catch (err) {
            setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputGroup = (label, name, type = 'text', placeholder = '') => (
        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                {label}
            </label>
            <input
                type={type}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                placeholder={placeholder}
                className="saas-input"
                style={errors[name] ? { borderColor: '#ef4444' } : {}}
            />
            {errors[name] && (
                <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.35rem' }}>{errors[name]}</p>
            )}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
            <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto', padding: '2rem' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                            <Layout size={24} />
                        </div>
                        <span>Project<span style={{ color: 'var(--primary)' }}>Tracker</span></span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>Create Account</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                        Join the platform as a student or staff guide.
                    </p>
                </div>

                <div className="saas-card animate-fade-in" style={{ padding: '2.5rem 2rem' }}>

                    {serverError && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} /> {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {inputGroup('Full Name', 'name', 'text', 'Jane Doe')}
                        {inputGroup('Email Address', 'email', 'email', 'name@college.edu')}

                        {/* Role selector */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500 }}>
                                Role
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="saas-input"
                            >
                                <option value="student">Student</option>
                                <option value="staff">Staff Guide</option>
                            </select>
                        </div>

                        {inputGroup('Password', 'password', 'password', 'Minimum 6 characters')}
                        {inputGroup('Confirm Password', 'confirmPassword', 'password', 'Re-enter your password')}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ padding: '0.875rem', fontSize: '1rem', width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <UserPlus size={16} />
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
