import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AthletesList from './pages/AthletesList';
import AthleteForm from './pages/AthleteForm';
import FinancialDashboard from './pages/FinancialDashboard';
import Scanner from './pages/Scanner';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import UpdatePassword from './pages/UpdatePassword';
import UsersManagement from './pages/UsersManagement';
import GroupsManagement from './pages/GroupsManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
  const { session, role, loading } = useAuth();
  
  if (loading) return null; // Avoid flicker

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />; // Redirect if not authorized
  }

  return children;
}

function AppLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="main-content">
        <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <AnimatePresence mode="wait">
          <motion.div 
            key={window.location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="page-container"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Chargement...</div>;
  }

  return (
    <Router>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: 'rgba(30, 41, 59, 0.8)', 
            backdropFilter: 'blur(12px)',
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            padding: '16px'
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } }
        }} 
      />
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/reset-password" element={session ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        {/* Public / Scanner route without sidebar */}
        <Route path="/scanner" element={<Scanner />} />
        
        {/* Admin routes with layout */}
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        
        <Route path="/athletes" element={<ProtectedRoute allowedRoles={['admin', 'secretaire', 'entraineur']}><AppLayout><AthletesList /></AppLayout></ProtectedRoute>} />
        <Route path="/athletes/new" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
        <Route path="/athletes/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
        
        <Route path="/finances" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><FinancialDashboard /></AppLayout></ProtectedRoute>} />
        
        <Route path="/groupes" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><GroupsManagement /></AppLayout></ProtectedRoute>} />
        
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><UsersManagement /></AppLayout></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
