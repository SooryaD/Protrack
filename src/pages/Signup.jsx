import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProjectService } from '../services/storage';
import { AlertCircle, Layout, CheckCircle, ArrowRight, UserCheck, KeyRound } from 'lucide-react';

const Signup = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    // Step 1: Verify roll no + phone
    const [step, setStep] = useState(1);
    const [rollNo, setRollNo] = useState('');
    const [phone, setPhone] = useState('');
    const [verifiedName, setVerifiedName] = useState('');
    const [verifiedGuide, setVerifiedGuide] = useState('');

    // Step 2: Set email + password
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Step 1: Verify Identity ──────────────────────────────────
    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');

        if (!rollNo.trim()) { setError('Please enter your Roll Number.'); return; }
        if (!phone.trim() || phone.trim().length < 10) { setError('Please enter a valid 10-digit phone number.'); return; }

        setLoading(true);
        const result = await ProjectService.verifyStudent(rollNo.trim().toUpperCase(), phone.trim());
        setLoading(false);

        if (result.success) {
            setVerifiedName(result.name);
            setVerifiedGuide(result.assignedGuideName);
            setStep(2);
        } else {
            setError(result.error);
        }
    };

    // ── Step 2: Create Account ───────────────────────────────────
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) { setError('Please enter your email.'); return; }
        if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

        setLoading(true);
        const result = await ProjectService.registerStudent(
            rollNo.trim().toUpperCase(),
            phone.trim(),
            email.trim().toLowerCase(),
            password,
            verifiedName
        );
        setLoading(false);

        if (result.success) {
            // Auto-login after registration
            const loginResult = await login({ email: email.trim().toLowerCase() }, password);
            if (loginResult.success) {
                navigate('/student-dashboard');
            } else {
                navigate('/login');
            }
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg-main)', padding: '2rem',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                        fontWeight: 700, fontSize: '2.6rem', color: 'var(--text-main)',
                    }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                            <Layout size={26} />
                        </div>
                        <span>Pro<span style={{ color: 'var(--primary)' }}>Track</span></span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Student Registration Portal
                    </p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                        { num: 1, label: 'Verify Identity', icon: <UserCheck size={14} /> },
                        { num: 2, label: 'Create Account', icon: <KeyRound size={14} /> },
                    ].map((s, i) => (
                        <React.Fragment key={s.num}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                                    background: step >= s.num ? 'var(--primary)' : 'var(--border-color, #e2e8f0)',
                                    color: step >= s.num ? 'white' : 'var(--text-muted)',
                                    transition: 'background 0.3s',
                                }}>
                                    {step > s.num ? <CheckCircle size={14} /> : s.num}
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: step >= s.num ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {s.label}
                                </span>
                            </div>
                            {i < 1 && (
                                <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="saas-card animate-fade-in" style={{ padding: '2.25rem' }}>

                    {/* Error */}
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

                    {/* ── STEP 1: Verify Roll No + Phone ── */}
                    {step === 1 && (
                        <>
                            <h2 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                Verify Your Identity
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
                                Enter your college-assigned <strong>Roll Number</strong> and your <strong>registered phone number</strong> to continue.
                            </p>

                            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Roll Number
                                    </label>
                                    <input
                                        className="saas-input"
                                        id="rollNo"
                                        type="text"
                                        value={rollNo}
                                        onChange={e => { setRollNo(e.target.value.toUpperCase()); setError(''); }}
                                        placeholder="e.g. 26MCA0001"
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Registered Phone Number
                                    </label>
                                    <input
                                        className="saas-input"
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={e => { setPhone(e.target.value); setError(''); }}
                                        placeholder="10-digit mobile number"
                                        maxLength={10}
                                        autoComplete="tel"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    id="verify-btn"
                                    disabled={loading}
                                    style={{ padding: '0.9rem', fontSize: '1rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    {loading ? 'Verifying…' : <><UserCheck size={17} /> Verify Identity</>}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── STEP 2: Set Email + Password ── */}
                    {step === 2 && (
                        <>
                            {/* Verified banner */}
                            <div style={{
                                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem',
                                marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            }}>
                                <CheckCircle size={18} color="#22c55e" flexShrink={0} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                        ✅ Identity Verified — {verifiedName}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Roll: {rollNo} &nbsp;|&nbsp; Guide: {verifiedGuide}
                                    </div>
                                </div>
                            </div>

                            <h2 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                Create Your Account
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
                                Set your college email and a secure password.
                            </p>

                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Email Address
                                    </label>
                                    <input
                                        className="saas-input"
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        placeholder="yourname@gmail.com"
                                        autoFocus
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Password
                                    </label>
                                    <input
                                        className="saas-input"
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={e => { setPassword(e.target.value); setError(''); }}
                                        placeholder="Minimum 6 characters"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        className="saas-input"
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                                        placeholder="Re-enter your password"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setError(''); }}
                                        style={{ flex: 1, padding: '0.9rem', background: 'var(--bg-card, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: 'var(--radius-sm)', fontWeight: 500, cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        id="register-btn"
                                        className="btn-primary"
                                        disabled={loading}
                                        style={{ flex: 2, padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        {loading ? 'Creating Account…' : <><KeyRound size={16} /> Create Account</>}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        Sign In
                    </Link>
                </p>
                <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                    Staff accounts are created by the administrator only.
                </p>
            </div>
        </div>
    );
};

export default Signup;
