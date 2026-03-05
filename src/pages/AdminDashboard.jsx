import React, { useState, useEffect } from 'react';
import { ProjectService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Users, BarChart2, Trash2, Plus, Briefcase, Activity, Clock, CheckCircle, XCircle, Shield, Star, LayoutDashboard, RefreshCw } from 'lucide-react';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'student', assignedGuideId: '', assignedGuideName: '' };

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, rejected: 0, inReview: 0 });
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [newUser, setNewUser] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [formMessage, setFormMessage] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [cscComments, setCscComments] = useState({});

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        const [statsData, usersData, projectsData] = await Promise.all([
            ProjectService.getStats(),
            ProjectService.getAllUsers(),
            ProjectService.getAllProposals(),
        ]);
        setStats(statsData);
        setUsers(usersData);
        setProjects(projectsData);
        setStaffList(usersData.filter(u => u.role === 'staff' && u.isActive !== false));
    };

    const validateForm = () => {
        const e = {};
        if (!newUser.name.trim()) e.name = 'Name is required.';
        if (!newUser.email.trim()) e.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(newUser.email)) e.email = 'Enter a valid email.';
        if (!newUser.password || newUser.password.length < 6) e.password = 'Password must be at least 6 characters.';
        if (newUser.role === 'student' && !newUser.assignedGuideId) e.assignedGuideId = 'Please assign a staff guide.';
        return e;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormMessage(null);
        const errors = validateForm();
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
        setSubmitting(true);
        const result = await ProjectService.addUser(newUser);
        setSubmitting(false);
        if (result.success) {
            setFormMessage({ type: 'success', text: `Account for "${newUser.name}" created successfully.` });
            setNewUser(EMPTY_FORM); setFormErrors({}); loadData();
        } else {
            setFormMessage({ type: 'error', text: result.error || 'Failed to create account.' });
        }
    };

    const handleFieldChange = (field, value) => {
        let update = { ...newUser, [field]: value };
        if (field === 'assignedGuideId') {
            const guide = staffList.find(s => s.id === value || s._id === value);
            update.assignedGuideName = guide ? guide.name : '';
        }
        if (field === 'role' && value !== 'student') { update.assignedGuideId = ''; update.assignedGuideName = ''; }
        setNewUser(update);
        if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Permanently delete this user?')) return;
        const result = await ProjectService.deleteUser(id);
        if (result.success) loadData();
        else setFormMessage({ type: 'error', text: 'Failed to delete: ' + result.error });
    };

    const handleCscReview = async (projectId, cscStatus) => {
        if (['CSC_SCOPE_MODIFICATION', 'CSC_NOT_APPROVED'].includes(cscStatus) && !cscComments[projectId]) {
            alert('Please provide a comment/reason for this decision.'); return;
        }
        const res = await ProjectService.cscReview(projectId, cscStatus, cscComments[projectId] || '', user?.name || 'Admin');
        if (res.success) { setCscComments(prev => ({ ...prev, [projectId]: '' })); loadData(); }
        else alert('CSC Review Failed: ' + res.error);
    };

    const getStatusBadge = (status) => {
        const config = {
            'TITLE_PENDING': { color: 'var(--warning)', bg: '#FEF3C7', label: 'IN REVIEW' },
            'RESUBMITTED': { color: 'var(--warning)', bg: '#FEF3C7', label: 'RESUBMITTED' },
            'CHANGES_REQUESTED': { color: 'var(--danger)', bg: '#FEE2E2', label: 'ATTENTION' },
            'TITLE_REJECTED': { color: 'var(--danger)', bg: '#FEE2E2', label: 'REJECTED' },
            'TITLE_APPROVED': { color: 'var(--primary)', bg: '#EFF6FF', label: 'AWAITING CSC' },
            'CSC_NOT_APPROVED': { color: 'var(--danger)', bg: '#FEE2E2', label: 'CSC REJECTED' },
            'FIRST_REVIEW_PENDING': { color: '#8B5CF6', bg: '#F3E8FF', label: '1ST REVIEW' },
            'FIRST_REVIEW_DONE': { color: 'var(--success)', bg: '#DCFCE7', label: '2ND REVIEW' },
            'SECOND_REVIEW_DONE': { color: 'var(--success)', bg: '#DCFCE7', label: 'FINAL STAGE' },
            'PROJECT_SUBMITTED': { color: '#8B5CF6', bg: '#F3E8FF', label: 'FINAL REVIEW' },
            'DOCUMENTS_VERIFIED': { color: 'var(--success)', bg: '#DCFCE7', label: 'VERIFIED' },
            'PROJECT_COMPLETED': { color: 'var(--success-deep)', bg: '#DCFCE7', label: 'DONE' },
        };
        const conf = config[status] || { color: 'var(--text-muted)', bg: '#F1F5F9', label: 'UNKNOWN' };
        return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '12px', background: conf.bg, color: conf.color, letterSpacing: '0.05em' }}>{conf.label}</span>;
    };

    const StatCard = ({ title, value, icon, color, bg }) => (
        <div className="saas-card animate-fade-in hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-full)', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>{value}</div>
            </div>
        </div>
    );

    const FieldError = ({ field }) => formErrors[field] ? <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.35rem' }}>{formErrors[field]}</p> : null;

    const tabBtn = (tab, label, Icon) => (
        <button onClick={() => setActiveTab(tab)} style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === tab ? 600 : 500, border: 'none', boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'var(--transition)', display: 'flex', alignItems: 'center' }}>
            <Icon size={16} style={{ marginRight: '0.5rem' }} />{label}
            {tab === 'csc' && projects.filter(p => p.status === 'TITLE_APPROVED').length > 0 && (
                <span style={{ marginLeft: '0.4rem', background: '#EF4444', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '9999px' }}>
                    {projects.filter(p => p.status === 'TITLE_APPROVED').length}
                </span>
            )}
        </button>
    );

    const pendingCsc = projects.filter(p => p.status === 'TITLE_APPROVED');
    const reviewedCsc = projects.filter(p => p.cscStatus && !['TITLE_APPROVED'].includes(p.status) && ['CSC_APPROVED', 'CSC_SCOPE_MODIFICATION', 'CSC_NOT_APPROVED'].includes(p.cscStatus));

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><LayoutDashboard size={24} color="var(--primary)" /> Admin Console</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>Manage users, review CSC proposals, and oversee all projects.</p>
                </div>
                <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 'var(--radius-md)', padding: '0.35rem', border: '1px solid var(--border-color)' }}>
                    {tabBtn('stats', 'Overview', BarChart2)}
                    {tabBtn('csc', 'CSC Review', Shield)}
                    {tabBtn('users', 'Users', Users)}
                    {tabBtn('projects', 'Projects', Briefcase)}
                </div>
            </div>

            {/* STATS TAB */}
            {activeTab === 'stats' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        <StatCard title="Total Projects" value={stats.total} icon={<Activity size={24} />} color="#8B5CF6" bg="#F3E8FF" />
                        <StatCard title="In Reviews" value={stats.inReview} icon={<Star size={24} />} color="#F59E0B" bg="#FEF3C7" />
                        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle size={24} />} color="var(--success-deep)" bg="#DCFCE7" />
                        <StatCard title="Rejected" value={stats.rejected} icon={<XCircle size={24} />} color="var(--danger)" bg="#FEE2E2" />
                    </div>
                    <div className="saas-card" style={{ padding: '2.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#DCFCE7', color: 'var(--success-deep)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 500, fontSize: '0.9rem', marginBottom: '1rem' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--success-deep)', borderRadius: '50%' }}></div>
                            System Operational
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>All Services Running</h3>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>Anna University portal workflow is active. Project pipeline is tracking all stages from title submission through viva-voce.</p>
                    </div>
                </div>
            )}

            {/* CSC REVIEW TAB */}
            {activeTab === 'csc' && (
                <div className="animate-fade-in">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={20} color="var(--primary)" /> Central Steering Committee (CSC) Review</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.4rem' }}>Review guide-approved project proposals. CSC can Approve, request Scope Modification, or reject proposals.</p>
                    </div>

                    {pendingCsc.length === 0 && (
                        <div className="saas-card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', marginBottom: '2rem' }}>
                            <Shield size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No Proposals Pending CSC Review</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Proposals appear here once a guide approves them.</p>
                        </div>
                    )}

                    {pendingCsc.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Review ({pendingCsc.length})</h3>
                            {pendingCsc.map(p => (
                                <div key={p.id} className="saas-card animate-fade-in" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>{p.ticketId}</span>
                                        <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Guide: {p.guideName}</span>
                                        <span style={{ fontSize: '0.72rem', background: '#F3E8FF', color: '#8B5CF6', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Domain: {p.domain}</span>
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>{p.title}</h3>
                                    <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Student: <strong style={{ color: 'var(--text-main)' }}>{p.studentName}</strong></p>
                                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-main)', marginBottom: '1.25rem', borderLeft: '3px solid var(--border-color)', paddingLeft: '0.75rem' }}>{p.abstract}</p>
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                        <textarea
                                            placeholder="CSC committee reason/comment (required for Scope Modification or Not Approved)…"
                                            value={cscComments[p.id] || ''}
                                            onChange={e => setCscComments(prev => ({ ...prev, [p.id]: e.target.value }))}
                                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.85rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                                            rows={2}
                                        />
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button onClick={() => handleCscReview(p.id, 'CSC_APPROVED')} style={{ flex: 1, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✓ Approve</button>
                                            <button onClick={() => handleCscReview(p.id, 'CSC_SCOPE_MODIFICATION')} style={{ flex: 1, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>↩ Scope Modification</button>
                                            <button onClick={() => handleCscReview(p.id, 'CSC_NOT_APPROVED')} style={{ flex: 1, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✗ Not Approved</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {reviewedCsc.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Previously Reviewed ({reviewedCsc.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {reviewedCsc.map(p => (
                                    <div key={p.id} style={{ padding: '1rem 1.25rem', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{p.title}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.studentName} · Guide: {p.guideName}</div>
                                            {p.cscComment && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>"{p.cscComment}"</div>}
                                        </div>
                                        {getStatusBadge(p.status)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    <div className="saas-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600 }}>
                            <Plus size={18} color="var(--primary)" /> Add New User
                        </h3>

                        {formMessage && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: formMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${formMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`, color: formMessage.type === 'success' ? '#15803d' : '#ef4444' }}>
                                {formMessage.type === 'success' ? <CheckCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} /> : <XCircle size={15} style={{ marginTop: '1px', flexShrink: 0 }} />}
                                {formMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateUser} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {[
                                { label: 'Full Name', field: 'name', placeholder: 'e.g. Jane Doe', type: 'text' },
                                { label: 'Email Address', field: 'email', placeholder: 'name@college.edu', type: 'email' },
                                { label: 'Password', field: 'password', placeholder: 'Minimum 6 characters', type: 'password' },
                            ].map(({ label, field, placeholder, type }) => (
                                <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</label>
                                    <input
                                        className="saas-input"
                                        type={type}
                                        value={newUser[field]}
                                        onChange={e => handleFieldChange(field, e.target.value)}
                                        placeholder={placeholder}
                                        style={formErrors[field] ? { borderColor: '#ef4444', background: '#fff8f8' } : {}}
                                    />
                                    {formErrors[field] && <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>{formErrors[field]}</p>}
                                </div>
                            ))}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Role</label>
                                <select className="saas-input" value={newUser.role} onChange={e => handleFieldChange('role', e.target.value)}>
                                    <option value="student">Student</option>
                                    <option value="staff">Staff Guide</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            {newUser.role === 'student' && (
                                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Assign Staff Guide</label>
                                    <select
                                        className="saas-input"
                                        value={newUser.assignedGuideId}
                                        onChange={e => handleFieldChange('assignedGuideId', e.target.value)}
                                        style={formErrors.assignedGuideId ? { borderColor: '#ef4444', background: '#fff8f8' } : {}}
                                    >
                                        <option value="">Select a guide…</option>
                                        {staffList.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.email})</option>)}
                                    </select>
                                    {staffList.length === 0 && (
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            ⚠️ No active staff guides found. Create a staff account first.
                                        </p>
                                    )}
                                    {formErrors.assignedGuideId && <p style={{ fontSize: '0.78rem', color: '#ef4444', margin: 0 }}>{formErrors.assignedGuideId}</p>}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn-primary" disabled={submitting} style={{ flex: 1, padding: '0.7rem' }}>
                                    {submitting ? 'Creating…' : 'Create User'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setNewUser(EMPTY_FORM); setFormErrors({}); setFormMessage(null); }}
                                    style={{ padding: '0.7rem 1rem', background: '#F1F5F9', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}
                                >
                                    <RefreshCw size={14} /> Reset
                                </button>
                            </div>
                        </form>
                    </div>


                    <div className="saas-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>System Users <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 400, marginLeft: '0.5rem' }}>({users.length})</span></h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {users.map(u => (
                                <div key={u.id || u._id} className="hover-scale" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: u.role === 'admin' ? '#F3E8FF' : u.role === 'staff' ? '#EFF6FF' : '#F1F5F9', color: u.role === 'admin' ? '#8B5CF6' : u.role === 'staff' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                            {u.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                {u.email} <span style={{ margin: '0 0.5rem', color: 'var(--border-color)' }}>|</span>
                                                <span style={{ textTransform: 'capitalize', color: u.role === 'admin' ? '#8B5CF6' : u.role === 'staff' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 500 }}>{u.role}</span>
                                                {u.role === 'student' && u.assignedGuideName && <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)' }}>· Guide: <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{u.assignedGuideName}</span></span>}
                                            </div>
                                        </div>
                                    </div>
                                    {u.role !== 'admin' && (
                                        <button onClick={() => handleDeleteUser(u.id || u._id)} style={{ padding: '0.5rem', background: '#FEE2E2', color: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
                <div className="animate-fade-in saas-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>All Projects <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 400, marginLeft: '0.5rem' }}>({projects.length})</span></h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {projects.map(p => (
                            <div key={p.id || p._id} className="hover-scale" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', border: '1px solid var(--border-color)', transition: 'var(--transition)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>{p.ticketId}</span>
                                        <span style={{ fontWeight: 600, fontSize: '1rem' }}>{p.title}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{p.studentName}</span>
                                        <span>·</span><span>{p.domain}</span>
                                        {p.guideName && <><span>·</span><span>Guide: {p.guideName}</span></>}
                                        {p.firstReview && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>· R1: {p.firstReview.normalizedOutOf20}/20</span>}
                                        {p.secondReview && <span style={{ color: 'var(--success)', fontWeight: 600 }}>· R2: {p.secondReview.normalizedOutOf20}/20</span>}
                                    </div>
                                </div>
                                {getStatusBadge(p.status)}
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                <Briefcase size={32} style={{ margin: '0 auto 1rem', opacity: 0.5, display: 'block' }} />
                                <p>No projects found in the system yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
