import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, Search } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <header className="glass-nav" style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            padding: '1rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '70px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', gap: '0.5rem' }}>
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Search projects or tickets..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '250px', color: 'var(--text-main)' }}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button style={{ color: 'var(--text-muted)', background: 'none', position: 'relative' }}>
                    <Bell size={20} />
                    <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></span>
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'none', color: 'var(--text-muted)',
                        fontSize: '0.9rem', fontWeight: 500
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </header>
    );
};

export default Navbar;
