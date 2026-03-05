import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Layout, ArrowLeft } from 'lucide-react';
import API from '../services/api';

// Two-step OTP-based password reset (Anna University portal style)
// Step 1: Enter rollNo + email + mobile → verify identity → OTP sent to console
// Step 2: Enter OTP + new password → reset

const ForgotPassword = () => {
    // Step 1 state
    const [rollNo, setRollNo] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [step1Loading, setStep1Loading] = useState(false);
    const [step1Error, setStep1Error] = useState('');

    // Step 2 state
    const [step, setStep] = useState(1); // 1 = identity verify, 2 = OTP + new pass
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step2Loading, setStep2Loading] = useState(false);
    const [step2Error, setStep2Error] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setStep1Error('');

        if (!rollNo.trim() || !email.trim() || !mobile.trim()) {
            setStep1Error('All three fields are required.');
            return;
        }

        setStep1Loading(true);
        try {
            await API.post('/auth/send-otp', {
                rollNo: rollNo.trim(),
                email: email.trim(),
                mobile: mobile.trim(),
            });
            setStep(2);
        } catch (err) {
            setStep1Error(err.response?.data?.message || 'Verification failed. Please check your details.');
        } finally {
            setStep1Loading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setStep2Error('');

        if (!otp.trim()) { setStep2Error('Please enter the OTP.'); return; }
        if (newPassword.length < 6) { setStep2Error('Password must be at least 6 characters.'); return; }
        if (newPassword !== confirmPassword) { setStep2Error('Passwords do not match.'); return; }

        setStep2Loading(true);
        try {
            await API.post('/auth/reset-password', {
                rollNo: rollNo.trim(),
                otp: otp.trim(),
                newPassword,
            });
            setSuccess(true);
        } catch (err) {
            setStep2Error(err.response?.data?.message || 'Reset failed. The OTP may have expired.');
        } finally {
            setStep2Loading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-main)', padding: '2rem',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                        fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.75rem'
                    }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                            <Layout size={24} />
                        </div>
                        <span>Project<span style={{ color: 'var(--primary)' }}>Tracker</span></span>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>Forgot Password</h2>
                    {/* Step indicator */}
                    {!success && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                            {[1, 2].map(s => (
                                <React.Fragment key={s}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 700,
                                        background: step >= s ? 'var(--primary)' : '#E2E8F0',
                                        color: step >= s ? 'white' : 'var(--text-muted)',
                                    }}>{s}</div>
                                    {s < 2 && <div style={{ width: '32px', height: '2px', background: step >= 2 ? 'var(--primary)' : '#E2E8F0' }} />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                <div className="saas-card animate-fade-in" style={{ padding: '2rem' }}>

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
                            }}>
                                <CheckCircle size={28} color="#16a34a" />
                            </div>
                            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Password Reset!</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                                You can now log in with your new password.
                            </p>
                            <Link
                                to="/"
                                className="btn-primary"
                                style={{ display: 'inline-block', padding: '0.75rem 2rem', textDecoration: 'none', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem' }}
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : step === 1 ? (
                        <>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                Enter your registered Roll Number, Email, and Mobile Number to verify your identity.
                            </p>
                            {step1Error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <AlertCircle size={14} /> {step1Error}
                                </div>
                            )}
                            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { label: 'Roll Number', value: rollNo, set: setRollNo, placeholder: 'e.g. 21CSE001', type: 'text' },
                                    { label: 'Registered Email', value: email, set: setEmail, placeholder: 'name@college.edu', type: 'email' },
                                    { label: 'Mobile Number', value: mobile, set: setMobile, placeholder: '9XXXXXXXXX', type: 'tel' },
                                ].map(({ label, value, set, placeholder, type }) => (
                                    <div key={label}>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                            {label}
                                        </label>
                                        <input
                                            className="saas-input"
                                            type={type}
                                            value={value}
                                            onChange={e => set(e.target.value)}
                                            placeholder={placeholder}
                                            required
                                        />
                                    </div>
                                ))}
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={step1Loading}
                                    style={{ padding: '0.875rem', marginTop: '0.5rem' }}
                                >
                                    {step1Loading ? 'Verifying…' : 'Get OTP'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <div style={{
                                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                                fontSize: '0.875rem', color: '#166534'
                            }}>
                                ✅ Identity verified! Check the <strong>server console</strong> for your 6-digit OTP.
                            </div>
                            {step2Error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <AlertCircle size={14} /> {step2Error}
                                </div>
                            )}
                            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Enter OTP
                                    </label>
                                    <input
                                        className="saas-input"
                                        type="text"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        placeholder="6-digit OTP"
                                        maxLength={6}
                                        style={{ letterSpacing: '0.2rem', fontWeight: 700, fontSize: '1.1rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        New Password
                                    </label>
                                    <input
                                        className="saas-input"
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        className="saas-input"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter new password"
                                    />
                                    {confirmPassword && newPassword !== confirmPassword && (
                                        <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.3rem' }}>Passwords don't match</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setStep2Error(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
                                        style={{
                                            flex: '0 0 auto', padding: '0.75rem 1rem',
                                            background: '#F1F5F9', border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)'
                                        }}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={step2Loading}
                                        style={{ flex: 1, padding: '0.75rem' }}
                                    >
                                        {step2Loading ? 'Resetting…' : 'Reset Password'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <Link to="/" style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowLeft size={14} /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
