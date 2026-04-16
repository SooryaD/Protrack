import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';

// Full-screen loading spinner shown while session is being validated
const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-main)', flexDirection: 'column', gap: '1rem',
  }}>
    <div style={{
      width: '48px', height: '48px',
      border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
    }} />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading session…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

// Public pages (no sidebar/navbar)
const PUBLIC_PATHS = ['/', '/forgot-password', '/signup', '/reset-password'];

const AppContent = () => {
  const location = useLocation();
  const { loading } = useAuth();

  // Exact match for public pages
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  if (loading) return <LoadingScreen />;

  if (isPublicPage) {
    return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <div className="app-content">
          <Routes>
            <Route
              path="/student-dashboard"
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff-dashboard"
              element={
                <ProtectedRoute allowedRole="staff">
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
