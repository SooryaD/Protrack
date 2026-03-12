import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProjectService } from '../services/storage';
import { FileText, Send, CheckCircle, Code, AlertCircle, Briefcase, Plus, ArrowLeft, Star, Award, Download, CalendarDays, Clock, XCircle } from 'lucide-react';

const PROJECT_DOMAINS = [
    'System Software / Tools Development',
    'Application Software Development',
    'Computer Networks Performance Analysis',
    'Web Development (Client-Server)',
    'Middleware Technology Development',
    'Mobile Computing / Mobile Application',
    'Database Applications',
    'Multimedia Development',
    'Data Mining & Network Security',
    'E-Governance / E-Learning Applications',
    'Image Processing & Soft Computing',
    'E-Commerce / E-Shopping',
    'Cloud Computing',
    'Big Data Analytics',
];

const STATUS_META = {
    'TITLE_PENDING': { label: 'Awaiting Guide Approval', color: '#3B82F6', bg: '#EFF6FF', step: 1 },
    'RESUBMITTED': { label: 'Resubmitted', color: '#3B82F6', bg: '#EFF6FF', step: 1 },
    'CHANGES_REQUESTED': { label: 'Changes Requested', color: '#F59E0B', bg: '#FEF3C7', step: 1 },
    'TITLE_REJECTED': { label: 'Rejected by Guide', color: '#EF4444', bg: '#FEE2E2', step: 0 },
    'TITLE_APPROVED': { label: 'Guide Approved – Awaiting CSC', color: '#22C55E', bg: '#DCFCE7', step: 2 },
    'CSC_NOT_APPROVED': { label: 'CSC Not Approved', color: '#EF4444', bg: '#FEE2E2', step: 0 },
    'FIRST_REVIEW_PENDING': { label: 'CSC Approved – First Review', color: '#8B5CF6', bg: '#F3E8FF', step: 3 },
    'FIRST_REVIEW_DONE': { label: 'First Review Done', color: '#22C55E', bg: '#DCFCE7', step: 4 },
    'SECOND_REVIEW_DONE': { label: 'Second Review Done', color: '#22C55E', bg: '#DCFCE7', step: 5 },
    'PROJECT_SUBMITTED': { label: 'Final Report Submitted', color: '#3B82F6', bg: '#EFF6FF', step: 6 },
    'REPORT_CHANGES_REQUESTED': { label: 'Report Changes Requested', color: '#F59E0B', bg: '#FEF3C7', step: 5 },
    'DOCUMENTS_VERIFIED': { label: 'Documents Verified', color: '#22C55E', bg: '#DCFCE7', step: 6 },
    'PENDING_ADMIN_APPROVAL': { label: 'Pending Admin Approval', color: '#8B5CF6', bg: '#F3E8FF', step: 6 },
    'PROJECT_COMPLETED': { label: 'Project Completed', color: '#16A34A', bg: '#DCFCE7', step: 7 },
};

const WORKFLOW_STEPS = [
    'Submit Title', 'Guide Review', 'CSC Review',
    '1st Review', '2nd Review', 'Final Report', 'Complete'
];

const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
    return (
        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30` }}>
            {meta.label}
        </span>
    );
};

const ReviewScoreCard = ({ title, review, outOf = 20 }) => {
    if (!review) return null;
    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem 1.25rem', background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" /> {title}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{review.normalizedOutOf20}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {outOf}</span>
                </div>
            </div>
            <div style={{ padding: '1rem 1.25rem' }}>
                {Object.entries(review.marks || {}).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px dashed #E2E8F0' }}>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span style={{ fontWeight: 600 }}>{val}</span>
                    </div>
                ))}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Submitted by {review.submittedBy} on {new Date(review.submittedAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

const StudentDashboard = () => {
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [guides, setGuides] = useState([]);
    const [view, setView] = useState('list');
    const [selectedProject, setSelectedProject] = useState(null);
    const fileInputRef = React.useRef(null);
    const [uploadType, setUploadType] = useState(null);
    const [abstractFile, setAbstractFile] = useState(null);
    const [formData, setFormData] = useState({ title: '', domain: '', techStack: '', abstract: '', guideId: '', guideName: '' });
    const [activeTab, setActiveTab] = useState('details');
    const [formError, setFormError] = useState('');
    const [myRequest, setMyRequest] = useState(null);

    useEffect(() => {
        if (user) {
            if (user.assignedGuideId) {
                loadProposals();
                loadGuides();
            } else {
                loadGuidesAndRequest();
            }
        }
    }, [user, view]);

    const loadGuidesAndRequest = async () => {
        const req = await ProjectService.getMyGuideRequest();
        if (req.success) setMyRequest(req.data);
        const g = await ProjectService.getStaffUsers();
        setGuides(g);
    };

    const loadProposals = async () => {
        const data = await ProjectService.getStudentProposals(user.id);
        setProposals(data);
        if (selectedProject) {
            const fresh = data.find(p => p.id === selectedProject.id);
            if (fresh) setSelectedProject(fresh);
        }
    };

    const loadGuides = async () => setGuides(await ProjectService.getStaffUsers());

    const handleCreateClick = () => {
        if (proposals.some(p => !['TITLE_REJECTED', 'CSC_NOT_APPROVED'].includes(p.status))) {
            alert('You already have an active project.'); return;
        }
        setFormData({
            title: '',
            domain: '',
            techStack: '',
            abstract: '',
            guideId: user?.assignedGuideId || '',
            guideName: user?.assignedGuideName || ''
        });
        setSelectedProject(null); setFormError(''); setAbstractFile(null); setView('create');
    };

    const handleViewProject = (project) => {
        setSelectedProject(project);
        setFormData({ title: project.title, domain: project.domain, techStack: project.techStack, abstract: project.abstract, guideId: project.guideId || '', guideName: project.guideName || '' });
        setAbstractFile(null);
        setView('details'); setActiveTab('details');
    };

    const handleChange = (e) => {
        if (e.target.name === 'guideId') {
            const g = guides.find(g => g.id === e.target.value);
            setFormData({ ...formData, guideId: e.target.value, guideName: g ? g.name : '' });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        const wordCount = formData.title.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 7) { setFormError('Project title must contain at least 7 words.'); return; }

        const finalGuideId = formData.guideId || user?.assignedGuideId;
        if (!selectedProject && !finalGuideId) { setFormError('Please select a project guide.'); return; }

        const payload = selectedProject ? { ...formData, id: selectedProject.id } : { ...formData, guideId: finalGuideId, guideName: formData.guideName || user?.assignedGuideName };
        const response = await ProjectService.submitProposal(user.id, user.name, payload, abstractFile);

        if (response.success) {
            loadProposals();
            if (!selectedProject) setView('list');
            else setSelectedProject(response.data);
        } else {
            setFormError(response.error);
        }
    };

    const handleRequestGuide = async (staffId) => {
        if (!window.confirm('Send a request to this guide?')) return;
        const res = await ProjectService.sendGuideRequest(staffId);
        if (res.success) {
            loadGuidesAndRequest();
        } else {
            alert(res.error);
        }
    };

    const handleFileUpload = (type) => { setUploadType(type); if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedProject) return;
        if (uploadType === 'code' && !file.name.endsWith('.zip')) return alert('Upload a .zip file.');
        if (uploadType !== 'code' && !file.name.endsWith('.pdf')) return alert('Upload a .pdf file.');
        const response = await ProjectService.uploadFile(selectedProject.id, uploadType, file);
        if (response.success) { setSelectedProject(response.data); setProposals(prev => prev.map(p => p.id === response.data.id ? response.data : p)); }
        else alert('Upload Failed: ' + response.error);
    };

    const handleSubmitForReview = async () => {
        if (!window.confirm('Submit final report? Files will be locked.')) return;
        const response = await ProjectService.updateStatus(selectedProject.id, 'PROJECT_SUBMITTED', 'Final project submitted for viva-voce.', user.name, user.role, user.id);
        if (response.success) { setSelectedProject(response.data); setProposals(prev => prev.map(p => p.id === response.data.id ? response.data : p)); }
        else alert('Submission Failed: ' + response.error);
    };

    const WorkflowBar = ({ status }) => {
        const currentStep = STATUS_META[status]?.step || 0;
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative', padding: '0 1rem' }}>
                <div style={{ position: 'absolute', top: '12px', left: '2rem', right: '2rem', height: '4px', background: 'var(--border-color)', zIndex: 0, borderRadius: '2px' }}>
                    <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.min((currentStep / (WORKFLOW_STEPS.length - 1)) * 100, 100)}%`, borderRadius: '2px', transition: 'width 0.5s ease' }} />
                </div>
                {WORKFLOW_STEPS.map((label, idx) => {
                    const done = idx <= currentStep;
                    const current = idx === currentStep;
                    return (
                        <div key={label} style={{ zIndex: 1, textAlign: 'center', minWidth: '80px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: done ? (current ? 'var(--primary)' : 'var(--success)') : 'white', border: `2px solid ${done ? (current ? 'var(--primary)' : 'var(--success)') : 'var(--border-color)'}`, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: current ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none' }}>
                                {done && !current && <CheckCircle size={14} color="white" />}
                                {current && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: done ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: current ? 700 : 500, textTransform: 'uppercase', lineHeight: 1.2, display: 'block' }}>{label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── SELECT GUIDE VIEW (If not assigned yet) ──────────────────
    if (user && !user.assignedGuideId) {
        return (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Briefcase size={26} color="var(--primary)" /> Guide Selection</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>You must select an available staff member to guide your project before you can submit a proposal.</p>
                </div>

                {myRequest && myRequest.status === 'pending' ? (
                    <div className="animate-fade-in saas-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ width: '80px', height: '80px', background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 14px 0 rgba(217, 119, 6, 0.2)' }}>
                            <Clock size={40} color="#D97706" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>Waiting for Approval</h2>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: 1.6 }}>
                            You have sent a request to <strong>{myRequest.staffName}</strong>. You will be able to submit your project proposal once they accept your request.
                        </p>
                        <div style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#FFFBEB', borderRadius: 'var(--radius-full)', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span>
                            <span style={{ fontSize: '0.9rem', color: '#B45309', fontWeight: 600, letterSpacing: '0.05em' }}>PENDING STAFF REVIEW</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {myRequest && myRequest.status === 'rejected' && (
                            <div style={{ padding: '1.25rem', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                <XCircle size={24} color="#DC2626" style={{ marginTop: '0.2rem' }} />
                                <div>
                                    <h3 style={{ fontSize: '1rem', color: '#B91C1C', margin: '0 0 0.25rem 0' }}>Request Rejected</h3>
                                    <p style={{ fontSize: '0.9rem', color: '#991B1B', margin: '0 0 0.5rem 0' }}>Your previous request to <strong>{myRequest.staffName}</strong> was rejected.</p>
                                    <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: 0, fontStyle: 'italic', background: 'rgba(255,255,255,0.4)', padding: '0.5rem', borderRadius: '4px' }}>Reason: {myRequest.rejectionReason}</p>
                                    <p style={{ fontSize: '0.85rem', color: '#991B1B', marginTop: '0.5rem', fontWeight: 600 }}>You may now request a different guide.</p>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            {guides.map(g => {
                                const count = g.currentStudentCount || 0;
                                const max = g.maxStudents || 2;
                                const isFull = count >= max;

                                return (
                                    <div key={g.id || g._id} className="saas-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', borderTop: isFull ? '3px solid var(--danger)' : '3px solid var(--success)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600 }}>{g.name?.charAt(0)}</div>
                                                <div>
                                                    <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.2rem 0' }}>{g.name}</h3>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{g.email}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ background: '#F8FAFC', padding: '0.875rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Capacity</span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isFull ? 'var(--danger)' : 'var(--success)' }}>
                                                {count} / {max} {isFull && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginLeft: '4px', padding: '2px 6px', background: '#FEE2E2', borderRadius: '4px' }}>Full</span>}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: 'auto' }}>
                                            <button
                                                onClick={() => handleRequestGuide(g.id || g._id)}
                                                disabled={isFull}
                                                className="btn-primary"
                                                style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
                                            >
                                                <Send size={16} /> Request Guide
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ── LIST VIEW ──────────────────────────────────────────────
    if (view === 'list') {
        const canCreate = !proposals.some(p => !['TITLE_REJECTED', 'CSC_NOT_APPROVED'].includes(p.status));
        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Projects</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track your academic project through the university approval pipeline.</p>
                    </div>
                    {canCreate && (
                        <button onClick={handleCreateClick} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}>
                            <Plus size={18} /> New Project
                        </button>
                    )}
                </div>

                {/* MCA Schedule Download */}
                <a
                    href="/mca_schedule.pdf"
                    download="MCA_Project_Schedule.pdf"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.9rem 1.25rem', marginBottom: '1.5rem',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: 'var(--radius-md, 10px)',
                        textDecoration: 'none', cursor: 'pointer',
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.18)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                >
                    <div style={{ background: 'rgba(99,102,241,0.12)', padding: '0.6rem', borderRadius: '8px', display: 'flex', flexShrink: 0 }}>
                        <CalendarDays size={20} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>MCA Project Schedule</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Download the official MCA project schedule &amp; timeline (PDF)</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', flexShrink: 0 }}>
                        <Download size={15} /> Download PDF
                    </div>
                </a>

                {proposals.length === 0 ? (
                    <div className="saas-card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
                        <Briefcase size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No Projects Yet</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Submit your project title to begin the approval workflow.</p>
                        <button onClick={handleCreateClick} style={{ color: 'var(--primary)', background: 'none', fontWeight: 600 }}>Submit your first project</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                        {proposals.map(p => (
                            <div key={p.id} onClick={() => handleViewProject(p)} className="saas-card animate-fade-in hover-scale" style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>{p.ticketId}</span>
                                    <StatusBadge status={p.status} />
                                </div>
                                <h3 style={{ fontSize: '1rem', lineHeight: 1.4, margin: 0 }}>{p.title}</h3>
                                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>{p.abstract}</p>
                                {/* Mini review scores */}
                                {(p.firstReview || p.secondReview || p.vivaScore) && (
                                    <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                                        {p.firstReview && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>Review 1: {p.firstReview.normalizedOutOf20}/20</span>}
                                        {p.secondReview && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)' }}>Review 2: {p.secondReview.normalizedOutOf20}/20</span>}
                                        {p.vivaScore && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563EB' }}>Viva: {p.vivaScore.marks}/20</span>}
                                    </div>
                                )}
                                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    <span>{p.domain}</span>
                                    <span>Guide: {p.guideName || user?.assignedGuideName || 'Unassigned'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── CREATE VIEW ─────────────────────────────────────────────
    if (view === 'create') {
        const wordCount = formData.title.trim().split(/\s+/).filter(Boolean).length;
        return (
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>
                    <ArrowLeft size={16} /> Back to Projects
                </button>
                <div className="saas-card animate-fade-in" style={{ padding: '2.5rem' }}>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Submit Project Proposal</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>Project title must have <strong>at least 7 words</strong>. You will be notified of guide approval status.</p>

                    {formError && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <AlertCircle size={15} /> {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Project Title</label>
                                <span style={{ fontSize: '0.8rem', color: wordCount >= 7 ? 'var(--success)' : '#F59E0B', fontWeight: 600 }}>{wordCount}/7 words min</span>
                            </div>
                            <input name="title" value={formData.title} onChange={handleChange} required className="saas-input" placeholder="Enter a descriptive title with at least 7 words" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>Domain / Type</label>
                                <select name="domain" value={formData.domain} onChange={handleChange} required className="saas-input">
                                    <option value="">Select domain…</option>
                                    {PROJECT_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>Tech Stack</label>
                                <input name="techStack" value={formData.techStack} onChange={handleChange} required className="saas-input" placeholder="e.g. React, Node.js, MongoDB" />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>Assigned Guide</label>
                            <div style={{ padding: '0.875rem 1rem', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CheckCircle size={18} color="var(--success)" /> {user.assignedGuideName}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>Abstract Text</label>
                            <textarea name="abstract" value={formData.abstract} onChange={handleChange} required className="saas-input" rows={4} placeholder="Brief textual abstract..." />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 500 }}>Abstract Document (.pdf)</label>
                            <input type="file" accept=".pdf" onChange={e => setAbstractFile(e.target.files[0])} required={!selectedProject} className="saas-input" style={{ padding: '0.5rem' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Submit Proposal</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // ── DETAILS VIEW ────────────────────────────────────────────
    if (!selectedProject) return null;
    const canUpload = ['TITLE_PENDING', 'TITLE_APPROVED', 'FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE', 'CHANGES_REQUESTED', 'RESUBMITTED', 'REPORT_CHANGES_REQUESTED'].includes(selectedProject.status);
    const canResubmit = ['CHANGES_REQUESTED', 'TITLE_REJECTED', 'CSC_NOT_APPROVED'].includes(selectedProject.status);
    const isSubmitted = ['PROJECT_SUBMITTED', 'DOCUMENTS_VERIFIED', 'PROJECT_COMPLETED', 'PENDING_ADMIN_APPROVAL'].includes(selectedProject.status);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', color: 'var(--text-muted)', marginBottom: '1.5rem', fontWeight: 500 }}>
                <ArrowLeft size={16} /> Back to Projects
            </button>

            <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Briefcase size={14} /> {selectedProject.ticketId}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h1 style={{ fontSize: '1.6rem', lineHeight: 1.3, fontWeight: 700, maxWidth: '70%' }}>{selectedProject.title}</h1>
                    <StatusBadge status={selectedProject.status} />
                </div>
            </div>

            <WorkflowBar status={selectedProject.status} />

            {/* CSC comment shown if scope modification or not approved */}
            {selectedProject.cscComment && ['CHANGES_REQUESTED', 'CSC_NOT_APPROVED'].includes(selectedProject.status) && (
                <div style={{ padding: '1rem', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    <strong>CSC Committee Comment:</strong> {selectedProject.cscComment}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                    <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                        {['details', 'reviews', 'repository'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.75rem 0', fontWeight: 500, textTransform: 'capitalize', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', background: 'none' }}>
                                {tab === 'reviews' ? 'Review Marks' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="saas-card animate-fade-in" style={{ padding: '2rem' }}>
                            {canResubmit && (
                                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#FEF3C7', borderRadius: 'var(--radius-md)', border: '1px solid #FDE68A' }}>
                                    <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', fontWeight: 500 }}>⚠️ Your proposal needs changes. Update the details and resubmit.</p>
                                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <input name="title" value={formData.title} onChange={handleChange} className="saas-input" placeholder="Project Title (min 7 words)" />
                                        <select name="domain" value={formData.domain} onChange={handleChange} className="saas-input">
                                            <option value="">Select domain…</option>
                                            {PROJECT_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <textarea name="abstract" value={formData.abstract} onChange={handleChange} className="saas-input" rows={3} placeholder="Updated abstract…" />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Upload New Details (.pdf) (Optional):</label>
                                            <input type="file" accept=".pdf" onChange={e => setAbstractFile(e.target.files[0])} className="saas-input" style={{ flex: 1, padding: '0.4rem' }} />
                                        </div>
                                        {formError && <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>{formError}</p>}
                                        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem' }}>Resubmit Proposal</button>
                                    </form>
                                </div>
                            )}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Abstract</h3>
                                <p style={{ fontSize: '0.95rem', lineHeight: 1.7 }}>{selectedProject.abstract}</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', padding: '1.25rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Domain</div><div style={{ fontWeight: 500 }}>{selectedProject.domain}</div></div>
                                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tech Stack</div><div style={{ fontWeight: 500 }}>{selectedProject.techStack}</div></div>
                                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Guide</div><div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{(selectedProject.guideName || user?.assignedGuideName || 'U').charAt(0)}</div>{selectedProject.guideName || user?.assignedGuideName || 'Unassigned'}</div></div>
                                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CSC Status</div><div style={{ fontWeight: 500 }}>{selectedProject.cscStatus ? selectedProject.cscStatus.replace(/_/g, ' ') : 'Pending'}</div></div>
                            </div>
                        </div>
                    )}

                    {/* REVIEWS TAB */}
                    {activeTab === 'reviews' && (
                        <div className="saas-card animate-fade-in" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Award size={20} color="var(--primary)" />
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Review Scores</h3>
                                {(selectedProject.firstReview || selectedProject.secondReview || selectedProject.vivaScore) && (
                                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)' }}>
                                        Total: {(
                                            (selectedProject.firstReview?.normalizedOutOf20 || 0) + 
                                            (selectedProject.secondReview?.normalizedOutOf20 || 0) + 
                                            ((selectedProject.vivaScore?.marks || 0) * 3)
                                        ).toFixed(1)} / 100
                                    </span>
                                )}
                            </div>
                            {!selectedProject.firstReview && !selectedProject.secondReview ? (
                                <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                                    <Star size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                                    Review marks will appear here after your guide submits them.
                                </div>
                            ) : (
                                <>
                                    <ReviewScoreCard title="First Review (20 Marks)" review={selectedProject.firstReview} />
                                    <ReviewScoreCard title="Second Review (20 Marks)" review={selectedProject.secondReview} />
                                    {selectedProject.vivaScore && (
                                        <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#F8FAFC', marginTop: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Award size={16} color="#3B82F6" /> Viva-Voce (60 Marks)
                                                </h4>
                                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563EB' }}>
                                                    {(selectedProject.vivaScore.marks * 3).toFixed(1)}
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.2rem' }}>/ 60</span>
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', background: 'white', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Examiner Comment</div>
                                                {selectedProject.vivaScore.comment || 'No comments provided.'}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* REPOSITORY TAB */}
                    {activeTab === 'repository' && (
                        <div className="saas-card animate-fade-in" style={{ padding: '2rem' }}>
                            {!canUpload ? (
                                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                    <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Repository Locked</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Files can be uploaded after CSC approval and during review stages.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {[
                                        { key: 'firstReview', label: 'First Review Document (.pdf)', desc: 'Literature & Problem Definition', icon: <FileText size={20} color="var(--primary)" />, color: '#EFF6FF', ext: '.pdf' },
                                        { key: 'secondReview', label: 'Second Review Document (.pdf)', desc: 'Design & Code Modules', icon: <FileText size={20} color="var(--primary)" />, color: '#EFF6FF', ext: '.pdf' },
                                        { key: 'code', label: 'Source Code (.zip)', desc: 'Full project codebase', icon: <Code size={20} color="var(--primary)" />, color: '#EFF6FF', ext: '.zip' },
                                        { key: 'report', label: 'Project Report (.pdf)', desc: 'Final documentation and thesis', icon: <FileText size={20} color="var(--danger)" />, color: '#FEE2E2', ext: '.pdf' },
                                    ].map(({ key, label, desc, icon, color }) => (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ background: color, padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>{icon}</div>
                                                <div><div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div></div>
                                            </div>
                                            {selectedProject.repository?.[key]
                                                ? <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, padding: '0.5rem 0.75rem', background: '#DCFCE7', borderRadius: 'var(--radius-sm)' }}><CheckCircle size={16} /> Uploaded</span>
                                                : <button onClick={() => handleFileUpload(key)} disabled={isSubmitted} style={{ padding: '0.5rem 1rem', background: '#F1F5F9', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontWeight: 500, fontSize: '0.85rem' }}>Upload File</button>
                                            }
                                        </div>
                                    ))}
                                    {!isSubmitted && selectedProject.repository?.code && selectedProject.repository?.report && ['SECOND_REVIEW_DONE', 'REPORT_CHANGES_REQUESTED'].includes(selectedProject.status) && (
                                        <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                            <h4 style={{ marginBottom: '0.5rem' }}>Ready for Final Submission</h4>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Both files uploaded. Submit for Viva-Voce examination.</p>
                                            <button onClick={handleSubmitForReview} className="btn-primary" style={{ padding: '0.875rem 2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Send size={16} /> Submit Final Report
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Activity History sidebar */}
                <div className="saas-card" style={{ padding: '1.5rem', position: 'sticky', top: '100px' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>Activity History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {selectedProject.history?.slice().reverse().map((h, i, arr) => (
                            <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                                {i !== arr.length - 1 && <div style={{ position: 'absolute', top: '24px', left: '11px', bottom: '-20px', width: '2px', background: 'var(--border-color)' }} />}
                                <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#F8FAFC', border: '2px solid white', boxShadow: '0 0 0 1px var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', zIndex: 1 }}>
                                    {h.by?.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{h.by}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>{h.comment}</div>
                                    <div style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: '#F1F5F9', display: 'inline-block', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: 500 }}>{h.action?.replace(/_/g, ' ')}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept={uploadType === 'code' ? '.zip' : '.pdf'} />
        </div>
    );
};

export default StudentDashboard;
