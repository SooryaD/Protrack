import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout, Home, Briefcase, Users, Settings } from 'lucide-react';

const Sidebar = () => {
    const { user } = useAuth();

    if (!user) return null;

    const navLinks = {
        student: [
            { to: '/student-dashboard', label: 'My Projects', icon: <Briefcase size={20} /> }
        ],
        staff: [
            { to: '/staff-dashboard', label: 'Project Board', icon: <Layout size={20} /> }
        ],
        admin: [
            { to: '/admin-dashboard', label: 'Overview', icon: <Home size={20} /> },
            { to: '/admin-users', label: 'Users', icon: <Users size={20} /> } // placeholder if they add more routes
        ]
    };

    const links = navLinks[user.role] || [];

    const linkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
        textDecoration: 'none',
        transition: 'var(--transition)',
        marginBottom: '0.25rem'
    });

    return (
        <aside className="app-sidebar" style={{ padding: '1.5rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.25rem', padding: '0 0.5rem', marginBottom: '2rem', color: 'var(--text-main)' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                    <Layout size={24} />
                </div>
                <span>Protrack</span>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 1rem', marginBottom: '0.75rem' }}>
                Main Menu
            </div>

            <nav style={{ flex: 1 }}>
                {links.map((link, idx) => (
                    <NavLink key={idx} to={link.to} style={linkStyle}>
                        {link.icon}
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: '1rem', marginTop: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in as</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                        {user.name.charAt(0)}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
