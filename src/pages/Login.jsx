import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Layout, RefreshCw, ShieldCheck } from 'lucide-react';

// ── Captcha helpers ────────────────────────────────────────────────
const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const useAdd = Math.random() > 0.4;
    if (useAdd) {
        return { question: `${a} + ${b}`, answer: a + b };
    } else {
        const big = Math.max(a, b), small = Math.min(a, b);
        return { question: `${big} − ${small}`, answer: big - small };
    }
};

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Captcha state
    const [captcha, setCaptcha] = useState(generateCaptcha);
    const [captchaInput, setCaptchaInput] = useState('');
    const [captchaError, setCaptchaError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const refreshCaptcha = useCallback(() => {
        setCaptcha(generateCaptcha());
        setCaptchaInput('');
        setCaptchaError('');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCaptchaError('');

        if (!identifier.trim()) { setError('Please enter your Roll Number or Email.'); return; }
        if (!password) { setError('Please enter your password.'); return; }

        // Validate CAPTCHA
        if (captchaInput.trim() === '') {
            setCaptchaError('Please solve the security question.');
            return;
        }
        if (parseInt(captchaInput.trim(), 10) !== captcha.answer) {
            setCaptchaError('Incorrect answer. Please try again.');
            refreshCaptcha();
            return;
        }

        setLoading(true);
        const result = await login({ identifier: identifier.trim() }, password);
        setLoading(false);

        if (result.success) {
            const role = result.user.role;
            if (role === 'admin') navigate('/admin-dashboard');
            else if (role === 'staff') navigate('/staff-dashboard');
            else navigate('/student-dashboard');
        } else {
            setError(result.error);
            refreshCaptcha();
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
                        fontWeight: 700, fontSize: '2.6rem', color: 'var(--text-main)',
                    }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                            <Layout size={26} />
                        </div>
                        <span>Pro<span style={{ color: 'var(--primary)' }}>Track</span></span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.6rem' }}>
                        SMART ACADAMIC PROJECT MONITORING AND DASHBOARDS SYSTEMS
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
                                Roll Number / Email Address
                            </label>
                            <input
                                className="saas-input"
                                type="text"
                                id="identifier"
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}

                                autoComplete="username"
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
                                placeholder=""
                                autoComplete="current-password"
                            />
                        </div>

                        {/* ── CAPTCHA ── */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                Security Check
                            </label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                background: 'var(--bg-card, rgba(255,255,255,0.04))',
                                border: captchaError
                                    ? '1.5px solid rgba(239,68,68,0.6)'
                                    : '1.5px solid var(--border, rgba(255,255,255,0.08))',
                                borderRadius: 'var(--radius-sm, 8px)',
                                padding: '0.6rem 0.85rem',
                            }}>
                                <ShieldCheck size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <span style={{
                                    fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700,
                                    color: 'var(--text-main)', letterSpacing: '0.08em',
                                    background: 'var(--primary-soft, rgba(99,102,241,0.12))',
                                    padding: '0.2rem 0.6rem', borderRadius: '6px',
                                    userSelect: 'none', flexShrink: 0,
                                }}>
                                    {captcha.question} = ?
                                </span>
                                <input
                                    className="saas-input"
                                    id="captcha-input"
                                    type="number"
                                    value={captchaInput}
                                    onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(''); }}
                                    placeholder="Answer"
                                    style={{ flex: 1, minWidth: 0, margin: 0 }}
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={refreshCaptcha}
                                    title="Get a new question"
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-muted)', padding: '4px', display: 'flex',
                                        borderRadius: '6px', transition: 'color 0.2s',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                            {captchaError && (
                                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <AlertCircle size={12} /> {captchaError}
                                </p>
                            )}
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

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    New student?{' '}
                    <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Create your account →
                    </Link>
                </p>
                <p style={{ textAlign: 'center', marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                    Staff accounts are created by the administrator only.
                </p>
            </div>
        </div>
    );
};

export default Login;
