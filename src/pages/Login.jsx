import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Layout } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password) { setError('Please enter your password.'); return; }

        setLoading(true);
        const result = await login({ email: email.trim() }, password);
        setLoading(false);

        if (result.success) {
            const role = result.user.role;
            if (role === 'admin') navigate('/admin-dashboard');
            else if (role === 'staff') navigate('/staff-dashboard');
            else navigate('/student-dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg-main)', padding: '2rem',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                        fontWeight: 700, fontSize: '1.6rem', color: 'var(--text-main)',
                    }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                            <Layout size={26} />
                        </div>
                        <span>Project<span style={{ color: 'var(--primary)' }}>Tracker</span></span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.6rem' }}>
                        University Student Project Portal
                    </p>
                </div>

                <div className="saas-card animate-fade-in" style={{ padding: '2.25rem' }}>
                    <h2 style={{ marginBottom: '1.75rem', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center' }}>
                        Sign In
                    </h2>

                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                            fontSize: '0.875rem', marginBottom: '1.5rem',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                            <AlertCircle size={15} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                Email Address
                            </label>
                            <input
                                className="saas-input"
                                type="email"
                                id="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@college.edu"
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                    Password
                                </label>
                                <Link
                                    to="/forgot-password"
                                    style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                className="saas-input"
                                type="password"
                                id="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            id="login-submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ padding: '0.9rem', fontSize: '1rem', marginTop: '0.25rem' }}
                        >
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                    Accounts are created by the system administrator only.
                </p>
            </div>
        </div>
    );
};

export default Login;
