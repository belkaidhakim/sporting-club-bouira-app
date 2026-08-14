import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AthletesList = lazy(() => import('./pages/AthletesList'));
const AthleteForm = lazy(() => import('./pages/AthleteForm'));
const FinancialDashboard = lazy(() => import('./pages/FinancialDashboard'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const UsersManagement = lazy(() => import('./pages/UsersManagement'));
const GroupsManagement = lazy(() => import('./pages/GroupsManagement'));
const PublicRegistration = lazy(() => import('./pages/PublicRegistration'));
const PendingInscriptions = lazy(() => import('./pages/PendingInscriptions'));
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

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
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  });

  // Gérer l'alerte de mise à jour
  React.useEffect(() => {
    if (needRefresh) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>Nouvelle version disponible !</span>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                updateServiceWorker(true);
                toast.dismiss(t.id);
              }}
            >
              Mettre à jour
            </button>
          </div>
        ),
        { duration: Infinity, position: 'bottom-right' }
      );
    }
  }, [needRefresh, updateServiceWorker]);

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
      <ErrorBoundary>
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Chargement de la page...</div>}>
          <Routes>
            <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/reset-password" element={session ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* Public routes without sidebar */}
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/inscription" element={<PublicRegistration />} />
            
            {/* Admin routes with layout */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            
            <Route path="/inscriptions-en-attente" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><PendingInscriptions /></AppLayout></ProtectedRoute>} />

            <Route path="/athletes" element={<ProtectedRoute allowedRoles={['admin', 'secretaire', 'entraineur']}><AppLayout><AthletesList /></AppLayout></ProtectedRoute>} />
            <Route path="/athletes/new" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
            <Route path="/athletes/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><AthleteForm /></AppLayout></ProtectedRoute>} />
            
            <Route path="/finances" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><FinancialDashboard /></AppLayout></ProtectedRoute>} />
            
            <Route path="/groupes" element={<ProtectedRoute allowedRoles={['admin', 'secretaire']}><AppLayout><GroupsManagement /></AppLayout></ProtectedRoute>} />
            
            <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><UsersManagement /></AppLayout></ProtectedRoute>} />
            
            <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
