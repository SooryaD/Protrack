import React, { useState, useEffect } from 'react';
import { ProjectService } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { Check, X, Clock, FileText, Star, Award, ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react';

// ─── First Review criteria (max 100 → normalized to 20) ─────────
const FIRST_REVIEW_CRITERIA = [
    { key: 'problemDefinition', label: 'Problem Definition', max: 10 },
    { key: 'literatureReview', label: 'Literature Review', max: 15 },
    { key: 'novelIdea', label: 'Novel Idea', max: 5 },
    { key: 'detailedDesign', label: 'Detailed Design', max: 10 },
    { key: 'methodology', label: 'Methodology', max: 30 },
    { key: 'guideMarks', label: 'Guide Marks', max: 30 },
];

// ─── Second Review criteria (max 100 → normalized to 20) ────────
const SECOND_REVIEW_CRITERIA = [
    { key: 'systemDesign', label: 'System Design', max: 10 },
    { key: 'modulesCompleted', label: 'Modules Completed', max: 30 },
    { key: 'dataSet', label: 'Data Set', max: 15 },
    { key: 'pseudoCode', label: 'Pseudo Code', max: 5 },
    { key: 'contribution', label: 'Contribution', max: 10 },
    { key: 'guideMarks', label: 'Guide Marks', max: 30 },
];

const initMarks = (criteria) => Object.fromEntries(criteria.map(c => [c.key, '']));

const STATUS_META = {
    'TITLE_PENDING': { label: 'Pending Review', color: '#F59E0B' },
    'RESUBMITTED': { label: 'Resubmitted', color: '#F59E0B' },
    'CHANGES_REQUESTED': { label: 'Changes Requested', color: '#EF4444' },
    'TITLE_REJECTED': { label: 'Rejected', color: '#EF4444' },
    'TITLE_APPROVED': { label: 'Guide Approved', color: '#22C55E' },
    'FIRST_REVIEW_PENDING': { label: 'First Review', color: '#8B5CF6' },
    'FIRST_REVIEW_DONE': { label: '1st Done', color: '#22C55E' },
    'SECOND_REVIEW_DONE': { label: '2nd Done', color: '#22C55E' },
    'PROJECT_SUBMITTED': { label: 'Report Submitted', color: '#3B82F6' },
    'DOCUMENTS_VERIFIED': { label: 'Docs Verified', color: '#22C55E' },
    'PROJECT_COMPLETED': { label: 'Completed', color: '#16A34A' },
};

const StaffDashboard = () => {
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [comment, setComment] = useState({});
    const [expanded, setExpanded] = useState({});
    const [firstMarks, setFirstMarks] = useState({});
    const [secondMarks, setSecondMarks] = useState({});
    const [activeReviewForm, setActiveReviewForm] = useState({});

    useEffect(() => {
        if (user) {
            loadProposals();
            const interval = setInterval(loadProposals, 5000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const loadProposals = async () => {
        const all = await ProjectService.getAllProposals();
        setProposals(all.filter(p => p.guideId === user.id));
    };

    const handleAction = async (id, status) => {
        if (['CHANGES_REQUESTED', 'TITLE_REJECTED'].includes(status) && !comment[id]) {
            alert('Please provide a reason when requesting changes or rejecting.'); return;
        }
        const res = await ProjectService.updateStatus(id, status, comment[id], user.name, user.role, user.id);
        if (res.success) { setComment(prev => ({ ...prev, [id]: '' })); loadProposals(); }
        else alert('Action Failed: ' + res.error);
    };

    const handleFirstReview = async (projectId) => {
        const marks = firstMarks[projectId] || {};
        const criteria = FIRST_REVIEW_CRITERIA;
        for (const c of criteria) {
            const v = parseInt(marks[c.key]);
            if (isNaN(v) || v < 0 || v > c.max) { alert(`${c.label}: must be 0–${c.max}.`); return; }
        }
        const res = await ProjectService.submitFirstReview(projectId, Object.fromEntries(criteria.map(c => [c.key, parseInt(marks[c.key])])), user.name, user.id);
        if (res.success) { setActiveReviewForm(p => ({ ...p, [projectId]: null })); loadProposals(); }
        else alert('Failed: ' + res.error);
    };

    const handleSecondReview = async (projectId) => {
        const marks = secondMarks[projectId] || {};
        const criteria = SECOND_REVIEW_CRITERIA;
        for (const c of criteria) {
            const v = parseInt(marks[c.key]);
            if (isNaN(v) || v < 0 || v > c.max) { alert(`${c.label}: must be 0–${c.max}.`); return; }
        }
        const res = await ProjectService.submitSecondReview(projectId, Object.fromEntries(criteria.map(c => [c.key, parseInt(marks[c.key])])), user.name, user.id);
        if (res.success) { setActiveReviewForm(p => ({ ...p, [projectId]: null })); loadProposals(); }
        else alert('Failed: ' + res.error);
    };

    const ReviewMarksForm = ({ projectId, criteria, marks, setMarks, onSubmit, title }) => {
        const vals = marks[projectId] || initMarks(criteria);
        const total = criteria.reduce((s, c) => s + (parseInt(vals[c.key]) || 0), 0);
        const normalized = Math.round((total / 100) * 20 * 10) / 10;
        return (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={15} color="#F59E0B" fill="#F59E0B" /> {title}
                    </h4>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>Score: {normalized}/20</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                    {criteria.map(c => (
                        <div key={c.key}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                                {c.label} <span style={{ color: 'var(--primary)' }}>(max {c.max})</span>
                            </label>
                            <input
                                type="number" min={0} max={c.max}
                                value={vals[c.key]}
                                onChange={e => setMarks(prev => ({ ...prev, [projectId]: { ...vals, [c.key]: e.target.value } }))}
                                className="saas-input"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}
                            />
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button onClick={() => setActiveReviewForm(p => ({ ...p, [projectId]: null }))} style={{ padding: '0.4rem 0.75rem', background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>Cancel</button>
                    <button onClick={onSubmit} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>Submit Marks</button>
                </div>
            </div>
        );
    };

    const columns = [
        { id: 'review', title: 'TITLE REVIEW', color: '#F59E0B', filter: p => ['TITLE_PENDING', 'RESUBMITTED'].includes(p.status) },
        { id: 'approved', title: 'APPROVED', color: '#22C55E', filter: p => p.status === 'TITLE_APPROVED' },
        { id: 'reviewing', title: 'REVIEWS', color: '#8B5CF6', filter: p => ['FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'].includes(p.status) },
        { id: 'final', title: 'FINAL REVIEW', color: '#3B82F6', filter: p => ['PROJECT_SUBMITTED', 'DOCUMENTS_VERIFIED'].includes(p.status) },
        { id: 'done', title: 'DONE', color: '#22C55E', filter: p => ['PROJECT_COMPLETED', 'TITLE_REJECTED', 'CSC_NOT_APPROVED'].includes(p.status) },
    ];

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><LayoutDashboard size={24} color="var(--primary)" /> Guide Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Review proposals, submit review marks, and manage student projects.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ background: '#F3E8FF', color: '#8B5CF6', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>{proposals.filter(p => ['FIRST_REVIEW_PENDING', 'FIRST_REVIEW_DONE', 'SECOND_REVIEW_DONE'].includes(p.status)).length} In Review</span>
                    <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>{proposals.filter(p => p.status === 'PROJECT_COMPLETED').length} Completed</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
                {columns.map(col => {
                    const colProposals = proposals.filter(col.filter);
                    return (
                        <div key={col.id} style={{ flex: '1', minWidth: '300px', background: '#F8FAFC', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.25rem', borderBottom: `3px solid ${col.color}`, background: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.title}</h3>
                                    <div style={{ background: `${col.color}20`, color: col.color, fontWeight: 700, fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' }}>{colProposals.length}</div>
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '0.875rem' }}>
                                {colProposals.map(p => {
                                    const isExpanded = expanded[p.id];
                                    const showReviewForm = activeReviewForm[p.id];
                                    return (
                                        <div key={p.id} className="saas-card animate-fade-in" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{p.ticketId}</span>
                                                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: STATUS_META[p.status]?.color || 'gray' }}>{STATUS_META[p.status]?.label || p.status}</span>
                                            </div>

                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 }}>{p.title}</div>

                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600 }}>{p.studentName?.charAt(0)}</div>
                                                {p.studentName} · {p.domain}
                                            </div>

                                            {/* Existing review scores */}
                                            {(p.firstReview || p.secondReview) && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    {p.firstReview && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#F3E8FF', color: '#8B5CF6', borderRadius: '4px', fontWeight: 600 }}>R1: {p.firstReview.normalizedOutOf20}/20</span>}
                                                    {p.secondReview && <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#DCFCE7', color: '#16A34A', borderRadius: '4px', fontWeight: 600 }}>R2: {p.secondReview.normalizedOutOf20}/20</span>}
                                                </div>
                                            )}

                                            {/* File links for review */}
                                            {['PROJECT_SUBMITTED', 'DOCUMENTS_VERIFIED', 'PROJECT_COMPLETED'].includes(p.status) && p.repository && (
                                                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem' }}>
                                                    {p.repository.code && <a href={`http://localhost:5000/${p.repository.code}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none', padding: '0.25rem 0.5rem', background: '#EFF6FF', borderRadius: 'var(--radius-sm)' }}><FileText size={12} /> Code</a>}
                                                    {p.repository.report && <a href={`http://localhost:5000/${p.repository.report}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', textDecoration: 'none', padding: '0.25rem 0.5rem', background: '#EFF6FF', borderRadius: 'var(--radius-sm)' }}><FileText size={12} /> Report</a>}
                                                </div>
                                            )}

                                            {/* ACTIONS */}
                                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                                                {/* Title review actions */}
                                                {['TITLE_PENDING', 'RESUBMITTED'].includes(p.status) && (
                                                    <>
                                                        <textarea
                                                            placeholder="Comment / reason (required for Reject or Changes)…"
                                                            value={comment[p.id] || ''}
                                                            onChange={e => setComment({ ...comment, [p.id]: e.target.value })}
                                                            style={{ width: '100%', background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.78rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', resize: 'none', outline: 'none' }}
                                                            rows={2}
                                                        />
                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                            <button onClick={() => handleAction(p.id, 'TITLE_APPROVED')} style={{ flex: 1, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.4rem', fontSize: '0.73rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✓ Approve</button>
                                                            <button onClick={() => handleAction(p.id, 'CHANGES_REQUESTED')} style={{ flex: 1, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '0.4rem', fontSize: '0.73rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>↩ Revision</button>
                                                            <button onClick={() => handleAction(p.id, 'TITLE_REJECTED')} style={{ flex: 1, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.4rem', fontSize: '0.73rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✗ Reject</button>
                                                        </div>
                                                    </>
                                                )}

                                                {/* First Review marks entry */}
                                                {p.status === 'FIRST_REVIEW_PENDING' && (
                                                    <>
                                                        {showReviewForm === 'first'
                                                            ? <ReviewMarksForm projectId={p.id} criteria={FIRST_REVIEW_CRITERIA} marks={firstMarks} setMarks={setFirstMarks} onSubmit={() => handleFirstReview(p.id)} title="First Review Marks (out of 100 → 20)" />
                                                            : <button onClick={() => setActiveReviewForm(pr => ({ ...pr, [p.id]: 'first' }))} style={{ background: '#F3E8FF', color: '#7C3AED', border: '1px solid #DDD6FE', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                <Star size={14} fill="#7C3AED" color="#7C3AED" /> Enter First Review Marks
                                                            </button>
                                                        }
                                                    </>
                                                )}

                                                {/* Second Review marks entry */}
                                                {p.status === 'FIRST_REVIEW_DONE' && (
                                                    <>
                                                        {showReviewForm === 'second'
                                                            ? <ReviewMarksForm projectId={p.id} criteria={SECOND_REVIEW_CRITERIA} marks={secondMarks} setMarks={setSecondMarks} onSubmit={() => handleSecondReview(p.id)} title="Second Review Marks (out of 100 → 20)" />
                                                            : <button onClick={() => setActiveReviewForm(pr => ({ ...pr, [p.id]: 'second' }))} style={{ background: '#F3E8FF', color: '#7C3AED', border: '1px solid #DDD6FE', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                                <Award size={14} color="#7C3AED" /> Enter Second Review Marks
                                                            </button>
                                                        }
                                                    </>
                                                )}

                                                {/* Final submission review */}
                                                {p.status === 'PROJECT_SUBMITTED' && (
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button onClick={() => handleAction(p.id, 'DOCUMENTS_VERIFIED')} style={{ flex: 1, background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.4rem', fontSize: '0.73rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✓ Verify Docs</button>
                                                        <button onClick={() => handleAction(p.id, 'CHANGES_REQUESTED')} style={{ flex: 1, background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.4rem', fontSize: '0.73rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>✗ Changes</button>
                                                    </div>
                                                )}

                                                {p.status === 'DOCUMENTS_VERIFIED' && (
                                                    <button onClick={() => handleAction(p.id, 'PROJECT_COMPLETED')} style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer', width: '100%' }}>🎓 Mark Project Complete</button>
                                                )}

                                                {p.status === 'TITLE_APPROVED' && (
                                                    <div style={{ background: '#F0FDF4', border: '1px dashed #BBF7D0', borderRadius: 'var(--radius-sm)', padding: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Awaiting CSC committee review
                                                    </div>
                                                )}

                                                {p.status === 'SECOND_REVIEW_DONE' && (
                                                    <div style={{ background: '#F0FDF4', border: '1px dashed #BBF7D0', borderRadius: 'var(--radius-sm)', padding: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Awaiting student final report submission
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {colProposals.length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '2rem 1rem' }}>No projects</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StaffDashboard;
